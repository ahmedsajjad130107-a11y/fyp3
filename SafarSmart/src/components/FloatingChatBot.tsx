import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { sendChatMessage, ChatTurn } from '../services/api';
import { summarizeItineraryForContext } from '../utils/itinerarySummarizer';
import { ItineraryResponse } from '../services/api';
import MarkdownText from './MarkdownText';

interface FloatingChatBotProps {
  itineraryData?: ItineraryResponse & { destination_city?: string; departure_city?: string };
  rawContext?: Record<string, any>;
  fabBottomOffset?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickActions?: { label: string; value: string }[];
}

export const FloatingChatBot: React.FC<FloatingChatBotProps> = ({ itineraryData, rawContext, fabBottomOffset }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ur'>('en'); // Language toggle
  const scrollViewRef = useRef<ScrollView>(null); 

  // Initialize with welcome message and reset when language changes
  useEffect(() => {
    if (visible) {
      const hasContext = !!(itineraryData || rawContext);
      const destName = itineraryData?.destination_city || (rawContext as any)?.destination || 'your destination';
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: language === 'ur'
          ? (hasContext
            ? `ہیلو! میں آپ کا سفر کا معاون ہوں۔ میں آپ کے ${destName === 'your destination' ? 'منزل' : destName} کے سفر کے بارے میں سوالات میں مدد کر سکتا ہوں۔ میں آپ کی کس طرح مدد کر سکتا ہوں؟`
            : 'ہیلو! میں آپ کا سفر کا معاون ہوں۔ میں آپ کی کس طرح مدد کر سکتا ہوں؟')
          : (hasContext
            ? `Hi! I'm your Travel Assistant. I can help you with questions about your trip to ${destName}. How can I help you?`
            : "Hi! I'm your Travel Assistant. How can I help you?"),
        timestamp: new Date(),
      };
      // Reset messages when language changes or modal opens
      setMessages([welcomeMessage]);
    }
  }, [visible, language]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText && !text) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Prepare context — use rawContext if provided, otherwise summarize itineraryData
      const context = rawContext
        ? rawContext
        : itineraryData
          ? summarizeItineraryForContext(itineraryData)
          : undefined;

      // Prepare history - convert to backend format
      const history: ChatTurn[] = messages
        .filter((msg) => msg.id !== 'welcome') // Keep all messages except welcome
        .map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      // Modify message to request Urdu if language is Urdu
      let finalMessage = messageText;
      if (language === 'ur') {
        finalMessage = `Please respond in Urdu (اردو): ${messageText}`;
      }

      // Call API
      const response = await sendChatMessage({
        message: finalMessage,
        itinerary_context: context,
        history: history.slice(-10), // Keep last 10 messages for context
      });

      // Extract reply text - handle both string and object responses
      let replyText = '';
      if (typeof response === 'string') {
        // If response is already a string
        replyText = response;
      } else if (response && typeof response === 'object') {
        // Extract reply from response object
        replyText = response.reply || (response as any).message || (response as any).answer || JSON.stringify(response);

        // If replyText is still JSON, try to parse it
        if (replyText.startsWith('{') || replyText.startsWith('[')) {
          try {
            const parsed = JSON.parse(replyText);
            replyText = parsed.reply || parsed.message || parsed.answer || replyText;
          } catch {
            // If parsing fails, use the string as-is
          }
        }
      } else {
        replyText = 'Sorry, I could not process that response.';
      }

      // Parse response for quick actions (Yes/No buttons)
      const quickActions = extractQuickActions(replyText);

      // Add assistant response - only the text, not raw JSON
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText, // Only the text string
        timestamp: new Date(),
        quickActions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Please try again later.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const extractQuickActions = (reply: string): { label: string; value: string }[] | undefined => {
    // Check if reply contains yes/no question patterns
    const lowerReply = reply.toLowerCase();
    if (
      lowerReply.includes('do you want') ||
      lowerReply.includes('would you like') ||
      lowerReply.includes('should we') ||
      (lowerReply.includes('yes') && lowerReply.includes('no'))
    ) {
      return [
        { label: 'YES', value: 'yes' },
        { label: 'NO', value: 'no' },
      ];
    }
    return undefined;
  };

  const handleQuickAction = (value: string) => {
    handleSend(value);
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottomOffset ?? 20 }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>💬</Text>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarIcon}>🤖</Text>
                </View>
                <Text style={styles.headerTitle}>Travel Assistant</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setLanguage(language === 'en' ? 'ur' : 'en')}
                  style={[styles.languageButton, language === 'ur' && styles.languageButtonActive]}
                >
                  <Text style={[styles.languageButtonText, language === 'ur' && styles.languageButtonTextActive]}>
                    {language === 'ur' ? 'اردو' : 'EN'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>─</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages Area */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrapper,
                    message.role === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper,
                  ]}
                >
                  {message.role === 'assistant' && (
                    <View style={styles.botAvatarSmall}>
                      <Text style={styles.botAvatarIconSmall}>🤖</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownText
                        content={message.content}
                        textStyle={[
                          styles.messageText,
                          styles.botMessageText,
                        ]}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.messageText,
                          styles.userMessageText,
                        ]}
                      >
                        {message.content}
                      </Text>
                    )}
                  </View>
                  {message.role === 'user' && (
                    <View style={styles.userAvatarSmall}>
                      <Text style={styles.userAvatarIconSmall}>👤</Text>
                    </View>
                  )}
                  <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>

                  {/* Quick Actions */}
                  {message.quickActions && message.quickActions.length > 0 && (
                    <View style={styles.quickActionsContainer}>
                      {message.quickActions.map((action, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.quickActionButton,
                            action.value === 'yes' ? styles.yesButton : styles.noButton,
                          ]}
                          onPress={() => handleQuickAction(action.value)}
                        >
                          <Text style={styles.quickActionText}>{action.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {loading && (
                <View style={styles.loadingWrapper}>
                  <View style={styles.botAvatarSmall}>
                    <Text style={styles.botAvatarIconSmall}>🤖</Text>
                  </View>
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachmentButton}>
                <Text style={styles.attachmentIcon}>📎</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message"
                placeholderTextColor={theme.colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || loading}
              >
                <Text style={styles.sendIcon}>✈️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 28,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: '85%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  botAvatarIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  languageButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  languageButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: theme.colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  botAvatarIconSmall: {
    fontSize: 18,
  },
  userAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarIconSmall: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  botBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botMessageText: {
    color: theme.colors.textPrimary,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginHorizontal: 8,
    alignSelf: 'flex-end',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 40,
    gap: 12,
  },
  quickActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
  },
  yesButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  noButton: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  attachmentButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachmentIcon: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
});

export default FloatingChatBot;

