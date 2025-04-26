export interface ImageMeta {
  url: string;
  title: string;
  description: string;
  caption: string;
  label: string;
  comment: string;
  videoEmbed: string | null;
  contentType: string;
  location: string;
  lastMoved: Date;
  comments: any[];
  carouselArrangement?: CarouselPhoto[];
  attachments?: Attachment[];
  id?: string;
}

export interface DemoWrapperProps {
  projectId: string;
  projectName: string;
}

export interface ImageMetadataFields {
  caption?: string;
  comments?: any[];
  attachments?: any[];
  carouselArrangement?: any[];
  lastMoved?: Date | any;
  [key: string]: any;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
}

export interface CarouselPhoto {
  id: string;
  order: number;
}

export interface ContinuousCalendarProps {
  images: ImageMeta[];
  onImageSelect: (image: ImageMeta) => void;
  onImageUpdate: (imageId: string, updates: Partial<ImageMeta>) => Promise<void>;
  loading: boolean;
} 