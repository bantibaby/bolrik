for (let sheet of document.styleSheets) {
  try {
    const rules = sheet.cssRules;
    // ⚠️ अब यहाँ पर आप rules के साथ जो भी करना चाहते हैं, वो करें
    for (let rule of rules) {
      if (rule.selectorText) {
        console.log("Found rule:", rule.selectorText);
      }
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'SecurityError')) {
      console.error('CSS parsing error:', error);
    }
    // SecurityError को suppress करें
  }
}
