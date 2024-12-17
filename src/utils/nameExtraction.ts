export const isValidName = (name: string): boolean => {
  const namePattern = /^[A-Za-z\s'-]+$/;
  return name.length >= 2 && namePattern.test(name);
};

export const extractNameFromFileName = (fileName: string): { firstName: string; surname: string } => {
  // Remove file extension
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  
  // Split by common separators
  const parts = nameWithoutExtension.split(/[-_\s]+/);
  
  // Default values
  let firstName = '';
  let surname = '';
  
  if (parts.length >= 2) {
    // Capitalize first letter of each part
    firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    surname = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    
    if (!isValidName(firstName) || !isValidName(surname)) {
      firstName = '';
      surname = '';
    }
  }
  
  return { firstName, surname };
};