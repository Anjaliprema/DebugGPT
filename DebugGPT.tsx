import { useState } from "react";
import "./index.css";

type Language = "JavaScript" | "Python" | "C" | "C++" | "Java" | "HTML" | "CSS" | "C#" | "TypeScript" | "Unknown";

type ErrorType = {
  line: number;
  message: string;
  suggestion: string;
  type: "syntax" | "logical" | "warning";
  codeSnippet?: string;
};

type Rule = {
  regex: RegExp;
  type: "syntax" | "warning" | "logical";
  message: string;
  suggestion: string;
};

const rules: Record<Language, Rule[]> = {
  JavaScript: [
    { regex: /==[^=]/, type: "warning", message: "Loose equality (==) found.", suggestion: "Use === for strict equality checks." },
    { regex: /\bvar\b/, type: "warning", message: "Found var declaration.", suggestion: "Use let or const for better scoping." },
    { regex: /console\.log\([^)]*$/, type: "syntax", message: "Possible missing semicolon.", suggestion: "Add a semicolon at the end." },
  ],
  TypeScript: [{ regex: /==[^=]/, type: "warning", message: "Loose equality (==) found.", suggestion: "Use === for strict equality checks." }],
  Python: [
    { regex: /^.*print\s+[^()]/, type: "syntax", message: "Python 3 print requires parentheses.", suggestion: "Use print() instead of print." },
    { regex: /^.*import \*/, type: "warning", message: "Wildcard import found.", suggestion: "Avoid 'import *'. Import what you need." },
  ],
  HTML: [{ regex: /<img\b(?!.*\balt=)/, type: "warning", message: "Image missing alt attribute.", suggestion: "Add alt for accessibility." }],
  CSS: [
    { regex: /!important/, type: "warning", message: "Avoid !important.", suggestion: "Use more specific selectors instead." },
    { regex: /px/, type: "warning", message: "Pixel units used.", suggestion: "Consider rem/em for responsiveness." },
  ],
  C: [], "C++": [], Java: [], "C#": [], Unknown: [],
};

export default function DebugGPT() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language | null>(null);
  const [errors, setErrors] = useState<ErrorType[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const detectLanguage = (code: string): Language => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return "Unknown";
    const patterns: { pattern: RegExp; language: Language }[] = [
      { pattern: /(function\s*\(|=>|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=)/, language: "JavaScript" },
      { pattern: /(def\s+\w+\s*\(|import\s+\w+|print\s*\(|from\s+\w+\s+import)/, language: "Python" },
      { pattern: /(#include\s*<|printf\s*\(|int\s+main\s*\()/, language: "C" },
      { pattern: /(std::|#include\s*<|using\s+namespace|cout\s*<<)/, language: "C++" },
      { pattern: /(public\s+class|System\.out\.println|import\s+java\.)/, language: "Java" },
      { pattern: /(<!DOCTYPE html>|<html|<div\s|class\s*=\s*")/, language: "HTML" },
      { pattern: /(\.\w+\s*{|#\w+\s*{|@media|color:\s*#)/, language: "CSS" },
      { pattern: /(using\s+System|namespace\s+\w+|Console\.WriteLine)/, language: "C#" },
      { pattern: /(type\s+\w+\s*=|interface\s+\w+\s*{|:\s*\w+\s*[;=])/, language: "TypeScript" },
    ];
    for (const { pattern, language } of patterns) {
      if (pattern.test(trimmedCode)) return language;
    }
    return "Unknown";
  };

  const analyzeCodeByRules = (lines: string[], language: Language, errors: ErrorType[], tips: string[]) => {
    const langRules = rules[language] || [];
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      langRules.forEach((rule) => {
        if (rule.regex.test(line)) {
          errors.push({ line: lineNumber, message: rule.message, suggestion: rule.suggestion, type: rule.type, codeSnippet: line.trim() });
        }
      });
    });
  };

  const analyzeGeneral = (lines: string[], errors: ErrorType[], tips: string[]) => {
    lines.forEach((line, index) => {
      if (line.length > 100) {
        tips.push(`Line ${index + 1} is long (${line.length} chars). Consider splitting.`);
      }
    });
    const content = lines.join("");
    if (content.includes("while(true)") || content.includes("for(;;)")) {
      errors.push({ line: lines.findIndex(l => l.includes("while(true)") || l.includes("for(;;)")) + 1, message: "Potential infinite loop detected.", suggestion: "Add a break condition.", type: "logical" });
    }
  };

  const analyzeCode = () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    setErrors([]);
    setTips([]);
    const detectedLang = detectLanguage(code);
    setLanguage(detectedLang);
    setTimeout(() => {
      const lines = code.split("\n");
      const newErrors: ErrorType[] = [];
      const newTips: string[] = [];
      analyzeCodeByRules(lines, detectedLang, newErrors, newTips);
      analyzeGeneral(lines, newErrors, newTips);
      setErrors(newErrors);
      setTips(newTips);
      setIsAnalyzing(false);
    }, 800);
  };

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  return (
    <div className={`debug-container ${theme}`}>
      <header className="header">
        <h1 className="logo">DebugGPT</h1>
        <div className="controls">
          <button onClick={toggleTheme}>{theme === 'dark' ? "☀️" : "🌙"}</button>
        </div>
      </header>

      <main>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="debug-textarea" placeholder="Paste your code here..." />
        <button className="analyze-btn" onClick={analyzeCode} disabled={!code.trim() || isAnalyzing}>{isAnalyzing ? "Analyzing..." : "Analyze Code"}</button>
        {language && <p><strong>Detected Language:</strong> {language}</p>}
        {errors.length > 0 && (
          <div>
            <h3>Issues Found ({errors.length})</h3>
            {errors.map((err, i) => (
              <div key={i} className="issue">
                <strong>Line {err.line}: [{err.type.toUpperCase()}]</strong>
                <pre>{err.codeSnippet}</pre>
                <p>{err.message}</p>
                <p><em>Suggestion:</em> {err.suggestion}</p>
              </div>
            ))}
          </div>
        )}
        {tips.length > 0 && (
          <div className="tips">
            <h3>Tips & Suggestions ({tips.length})</h3>
            <ul>{tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
          </div>
        )}
      </main>
    </div>
  );
}
