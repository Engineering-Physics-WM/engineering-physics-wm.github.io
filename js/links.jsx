/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

const YANG_URL = "https://yangran.org";
const YANG_TEXT_RE = /(Prof\.?\s+Ran\s+Yang|Prof\.?\s+Yang|Dr\.?\s+Yang|Ran\s+Yang)/gi;
const YANG_TEXT_EXACT_RE = /^(Prof\.?\s+Ran\s+Yang|Prof\.?\s+Yang|Dr\.?\s+Yang|Ran\s+Yang)$/i;

const isYangName = (name = "") =>
  /^(prof\.?\s+)?ran yang$/i.test(name.trim()) || /^dr\.?\s+yang$/i.test(name.trim());
const isExternalHref = (href = "") => /^(https?:)?\/\//i.test(String(href).trim());

const normalizeHref = (href = "") => {
  const str = String(href).trim();
  if (!str || /^(https?:|\/\/|\/|#|mailto:|tel:|data:)/i.test(str)) return str;
  return `https://${str}`;
};

const ExternalLink = ({ href, children, target, rel, ...props }) => {
  const normalized = normalizeHref(href);
  const external = isExternalHref(normalized);
  return (
    <a
      href={normalized}
      target={target ?? (external ? "_blank" : undefined)}
      rel={rel ?? (external ? "noopener noreferrer" : undefined)}
      {...props}
    >
      {children}
    </a>
  );
};

const YangLink = ({ children = "Ran Yang", className = "", ...props }) => (
  <ExternalLink
    href={YANG_URL}
    className={["yang-link", className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </ExternalLink>
);

const PersonLink = ({ name, children = name, ...props }) =>
  isYangName(name) ? <YangLink {...props}>{children}</YangLink> : <>{children}</>;

const LinkedText = ({ text }) => {
  if (!text) return null;
  const parts = String(text).split(YANG_TEXT_RE);
  return parts.map((part, index) => {
    if (!part) return null;
    return YANG_TEXT_EXACT_RE.test(part) ? (
      <YangLink key={index}>{part}</YangLink>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    );
  });
};

export {
  ExternalLink,
  LinkedText,
  PersonLink,
  YangLink,
  YANG_URL,
  isExternalHref,
  isYangName,
  normalizeHref,
};
