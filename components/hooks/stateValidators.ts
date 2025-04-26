import { SocialMediaInstance } from "@/components/ui/social-media-switch";

export type ViewMode = "full" | "list";
export type TabType = "FBA CARE MAIN" | "Learning Hub" | "Podcast";

export function isViewMode(value: any): value is ViewMode {
  return value === "full" || value === "list";
}

export function isTabType(value: any): value is TabType {
  return value === "FBA CARE MAIN" || value === "Learning Hub" || value === "Podcast";
}

export function isSocialMediaInstance(value: any): value is SocialMediaInstance {
  return ["instagram", "facebook", "tiktok"].includes(value);
}

export function isString(value: any): value is string {
  return typeof value === "string";
}

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
} 