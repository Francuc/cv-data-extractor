const standardizePhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('44')) {
    cleaned = cleaned.substring(2);
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned.length === 10 ? cleaned : '';
};

const phoneNumberPatterns = [
  // Basic UK mobile formats
  /0[0-9]{10}/g,
  /07[0-9]{9}/g,
  /\+447[0-9]{9}/g,
  /00447[0-9]{9}/g,
  /[0-9]{11}/g,
  /07[0-9]\d\s?\d{3}\s?\d{3}/g,
  /\b\d{11}\b/g,
  /\b\d{10}\b/g,
  /[0-9+\s()-]{10,14}/g,
  /(?:\+44|0044|0)7\d{9}/g,
  
  // Additional patterns with various separators
  /(\+44|0044|0)[-\s]?7\d{3}[-\s]?\d{3}[-\s]?\d{3}/g,
  /(\+44|0044|0)[-\s]?7\d{3}[-\s]?\d{6}/g,
  /07\d{3}[-\s]?\d{6}/g,
  /(\+44|0044|0)[-\s]?7\d{9}/g,
  /\(?07\d{3}\)?[-\s]?\d{3}[-\s]?\d{3}/g,
  
  // International format variations
  /\+44[-\s]?[1-9]\d{2}[-\s]?\d{3}[-\s]?\d{4}/g,
  /\+44[-\s]?[1-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}/g,
  /00\s?44\s?[1-9]\d{2}\s?\d{3}\s?\d{4}/g,
  
  // Landline formats
  /0[1-9]\d{2}[-\s]?\d{3}[-\s]?\d{4}/g,
  /0[1-9]\d{1}[-\s]?\d{3}[-\s]?\d{4}/g,
  
  // Formats with parentheses
  /\(\+44\)[-\s]?7\d{3}[-\s]?\d{3}[-\s]?\d{3}/g,
  /\(0\d{3}\)[-\s]?\d{3}[-\s]?\d{4}/g,
  /\(0\d{4}\)[-\s]?\d{5,6}/g,
  
  // Formats with dots
  /07\d{3}\.?\d{3}\.?\d{3}/g,
  /\+44\.7\d{3}\.?\d{3}\.?\d{3}/g,
  
  // Mobile formats with various groupings
  /07\d{2}\s?\d{2}\s?\d{2}\s?\d{3}/g,
  /07\d{2}\s?\d{3}\s?\d{4}/g,
  /07\d\s?\d{4}\s?\d{4}/g,
  
  // Formats with dashes
  /07\d{3}-\d{3}-\d{3}/g,
  /\+44-7\d{3}-\d{3}-\d{3}/g,
  /0044-7\d{3}-\d{3}-\d{3}/g,
  
  // Mixed separator formats
  /07\d{3}[.-]\d{3}[.-]\d{3}/g,
  /\+44[-\s]?7\d{3}[.-]\d{3}[.-]\d{3}/g,
  
  // Extended international formats
  /\+44\s?\(0\)\s?7\d{3}\s?\d{3}\s?\d{3}/g,
  /44\s?0?\s?7\d{3}\s?\d{3}\s?\d{3}/g,
  
  // Additional variations
  /\(?0\d{4}\)?\s?\d{5,6}/g,
  /\(?0\d{3}\)?\s?\d{3}\s?\d{4}/g,
  /\(?0\d{2}\)?\s?\d{4}\s?\d{4}/g,
  /\(?0\d{2}\)?\s?\d{3}\s?\d{5}/g,
  
  // Complex formats with optional components
  /(?:\+[\d]{1,3}|0)(?:[\s-]?\d{1,4}){3,5}/g,
  /(?:\+44|44|0)(?:[\s-]?\d{1,4}){3,5}/g,
  
  // Formats with optional area codes
  /(?:\+44\s?)?(?:\(0\)\s?)?\d{2,5}(?:[\s-]\d{1,4}){2,3}/g,
  
  // Additional mobile patterns
  /(?:(?:\+|00)44|0)7(?:[1-4]\d\d|5(?:0[0-8]|[13-9]\d|2[0-35-9])|624|7(?:[45]\d\d|624)|8(?:[45]\d\d|624)|9(?:[45]\d\d|624))\d{6}/g,
  /(?:(?:\+|00)44|0)7\d{9}/g,
  
  // Formats with optional country code and spaces
  /(?:\+44|0044|0)\s*7\d{3}\s*\d{6}/g,
  /(?:\+44|0044|0)\s*7\d{3}\s*\d{3}\s*\d{3}/g,
  
  // Additional variations with optional components
  /(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}/g,
  /(?:\+44\s?|0)(?:7(?:[1-4]\d\d|5(?:0[0-8]|[13-9]\d|2[0-35-9])|624|7(?:[45]\d\d|624)|8(?:[45]\d\d|624)|9(?:[45]\d\d|624)))\s?\d{3}\s?\d{3}/g,
  
  // Catch-all patterns (use with caution)
  /(?:\+44|0044|0)?[ -]?\d{2,5}[ -]?\d{2,5}[ -]?\d{2,5}/g,
  /\d{3}[-\s]?\d{3,4}[-\s]?\d{4}/g
];

export const extractPhoneNumber = (text: string): string => {
  for (const pattern of phoneNumberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const standardized = standardizePhoneNumber(match);
        if (standardized) {
          return standardized;
        }
      }
    }
  }
  return '';
};
