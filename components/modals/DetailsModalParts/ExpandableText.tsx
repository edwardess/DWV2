// Put the components/DetailsModalParts/ExpandableText.tsx code here // ExpandableText.tsx
import React from "react";

interface ExpandableTextProps {
  text: string;
  expanded: boolean;
  setExpanded: (val: boolean) => void;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, expanded, setExpanded }) => {
  if (!text || text === "N/A" || text.length <= 100) {
    return (
      <div className="whitespace-pre-wrap text-xs text-gray-600 break-all">
        {text || "N/A"}
      </div>
    );
  }

  const displayedText = expanded ? text : text.slice(0, 100) + "...";
  return (
    <div className="relative">
      <div className="whitespace-pre-wrap text-xs text-gray-600 break-all">
        {displayedText}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute bottom-0 right-0 text-[0.6rem] text-blue-600 hover:text-blue-800 transition-colors"
      >
        {expanded ? "Show Less" : "Show More"}
      </button>
    </div>
  );
};

export default ExpandableText;
