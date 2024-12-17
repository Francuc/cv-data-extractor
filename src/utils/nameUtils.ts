export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const isValidName = (name: string): boolean => {
  const namePattern = /^[A-Za-z\s'-]+$/;
  return name.length >= 2 && namePattern.test(name);
};

export const extractNamesFromFileName = (fileName: string): { firstName: string; surname: string } | null => {
  // Remove file extension
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  
  // Common separators in filenames
  const separators = ['-', '_', ' '];
  
  for (const separator of separators) {
    const parts = nameWithoutExtension.split(separator).filter(part => part.length > 0);
    
    if (parts.length >= 2) {
      // Try different combinations of adjacent parts
      for (let i = 0; i < parts.length - 1; i++) {
        const potentialFirstName = parts[i];
        const potentialSurname = parts[i + 1];
        
        if (isValidName(potentialFirstName) && isValidName(potentialSurname)) {
          return {
            firstName: capitalizeFirstLetter(potentialFirstName),
            surname: capitalizeFirstLetter(potentialSurname)
          };
        }
      }
    }
  }
  
  return null;
};

export const extractNamesFromText = (text: string): { firstName: string; surname: string } => {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  for (let i = 0; i < words.length - 1; i++) {
    if (isValidName(words[i]) && isValidName(words[i + 1])) {
      return {
        firstName: capitalizeFirstLetter(words[i]),
        surname: capitalizeFirstLetter(words[i + 1])
      };
    }
  }
  
  return {
    firstName: '',
    surname: ''
  };
};