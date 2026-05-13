import React from 'react';
import { Text, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';

// Global key counter to ensure unique keys across all markdown renders
let globalKeyCounter = 0;

interface MarkdownTextProps {
  content: string;
  style?: any;
  textStyle?: any;
}

/**
 * Simple markdown parser for React Native
 * Handles:
 * - # Headings
 * - **bold**
 * - *italic*
 * - `code`
 * - [links](url)
 * - line breaks
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  style,
  textStyle,
}) => {
  const parseMarkdown = (
    text: string,
    baseKey: number
  ): React.ReactNode[] => {
    if (!text) return [];

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = baseKey;

    // Markdown patterns
    const patterns = [
      // H3 Heading
      {
        regex: /^###\s+(.+)$/,
        type: 'h3',
      },

      // H2 Heading
      {
        regex: /^##\s+(.+)$/,
        type: 'h2',
      },

      // H1 Heading
      {
        regex: /^#\s+(.+)$/,
        type: 'h1',
      },

      // Links: [text](url)
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        type: 'link',
      },

      // Bold: **text**
      {
        regex: /\*\*([^*]+)\*\*/g,
        type: 'bold',
      },

      // Italic: *text*
      {
        regex: /(?<!\*)\*([^*]+)\*(?!\*)/g,
        type: 'italic',
      },

      // Code: `text`
      {
        regex: /`([^`]+)`/g,
        type: 'code',
      },
    ];

    // Find all matches
    const matches: Array<{
      start: number;
      end: number;
      type: string;
      content: string;
      url?: string;
    }> = [];

    patterns.forEach(({ regex, type }) => {
      const flags = regex.flags.includes('g')
        ? regex.flags
        : `${regex.flags}g`;

      const globalRegex = new RegExp(regex.source, flags);

      let match;

      while ((match = globalRegex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
          content: match[1],
          url: type === 'link' ? match[2] : undefined,
        });
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlaps
    const filteredMatches: typeof matches = [];
    let lastEnd = 0;

    matches.forEach((match) => {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build output
    filteredMatches.forEach((match) => {
      // Add plain text before match
      if (match.start > currentIndex) {
        const beforeText = text.substring(currentIndex, match.start);

        if (beforeText) {
          parts.push(
            <Text key={`text-${key++}`} style={textStyle}>
              {beforeText}
            </Text>
          );
        }
      }

      // Add formatted content
      switch (match.type) {
        case 'h1':
          parts.push(
            <Text key={`h1-${key++}`} style={[textStyle, styles.h1]}>
              {match.content}
            </Text>
          );
          break;

        case 'h2':
          parts.push(
            <Text key={`h2-${key++}`} style={[textStyle, styles.h2]}>
              {match.content}
            </Text>
          );
          break;

        case 'h3':
          parts.push(
            <Text key={`h3-${key++}`} style={[textStyle, styles.h3]}>
              {match.content}
            </Text>
          );
          break;

        case 'bold':
          parts.push(
            <Text key={`bold-${key++}`} style={[textStyle, styles.bold]}>
              {match.content}
            </Text>
          );
          break;

        case 'italic':
          parts.push(
            <Text key={`italic-${key++}`} style={[textStyle, styles.italic]}>
              {match.content}
            </Text>
          );
          break;

        case 'code':
          parts.push(
            <Text key={`code-${key++}`} style={[textStyle, styles.code]}>
              {match.content}
            </Text>
          );
          break;

        case 'link':
          parts.push(
            <Text
              key={`link-${key++}`}
              style={[textStyle, styles.link]}
              onPress={() => {
                if (match.url) {
                  Linking.openURL(match.url).catch((err) =>
                    console.error('Failed to open URL:', err)
                  );
                }
              }}
            >
              {match.content}
            </Text>
          );
          break;
      }

      currentIndex = match.end;
    });

    // Remaining plain text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);

      if (remainingText) {
        parts.push(
          <Text key={`text-${key++}`} style={textStyle}>
            {remainingText}
          </Text>
        );
      }
    }

    // No markdown found
    if (parts.length === 0) {
      return [
        <Text key={`text-${key}`} style={textStyle}>
          {text}
        </Text>,
      ];
    }

    return parts;
  };

  // Split lines
  const lines = content.split('\n');

  const processedLines: React.ReactNode[] = [];

  let globalKey = globalKeyCounter;

  lines.forEach((line, index) => {
    if (line.trim()) {
      const parsed = parseMarkdown(line, globalKey);

      globalKey += parsed.length;

      processedLines.push(...parsed);
    }

    // Line break
    if (index < lines.length - 1) {
      processedLines.push(
        <Text key={`br-${globalKey++}`}>{'\n'}</Text>
      );
    }
  });

  globalKeyCounter = globalKey;

  return (
    <Text style={style}>
      {processedLines}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginVertical: 8,
  },

  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 6,
  },

  h3: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },

  bold: {
    fontWeight: '700',
  },

  italic: {
    fontStyle: 'italic',
  },

  code: {
    fontFamily: 'monospace',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },

  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});

export default MarkdownText;