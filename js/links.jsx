import * as React from "react";

const YANG_URL = "https://yangran.org";
const YANG_TEXT_RE = /(Prof\.?\s+Ran\s+Yang|Prof\.?\s+Yang|Dr\.?\s+Yang|Ran\s+Yang)/gi;
const YANG_TEXT_EXACT_RE = /^(Prof\.?\s+Ran\s+Yang|Prof\.?\s+Yang|Dr\.?\s+Yang|Ran\s+Yang)$/i;

const isYangName = (name = "") => /^(prof\.?\s+)?ran yang$/i.test(name.trim()) || /^dr\.?\s+yang$/i.test(name.trim());

const YangLink = ({ children = "Ran Yang", className = "", ...props }) => (
  <a
    href={YANG_URL}
    target="_blank"
    rel="noopener"
    className={["yang-link", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </a>
);

const PersonLink = ({ name, children = name, ...props }) => (
  isYangName(name)
    ? <YangLink {...props}>{children}</YangLink>
    : <>{children}</>
);

const LinkedText = ({ text }) => {
  if (!text) return null;
  const parts = String(text).split(YANG_TEXT_RE);
  return parts.map((part, index) => {
    if (!part) return null;
    return YANG_TEXT_EXACT_RE.test(part)
      ? <YangLink key={index}>{part}</YangLink>
      : <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export { LinkedText, PersonLink, YangLink, YANG_URL, isYangName };
