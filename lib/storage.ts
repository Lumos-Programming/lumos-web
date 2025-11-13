import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

// Storage paths
export const STORAGE_PATHS = {
  NEWS_IMAGES: 'images/news',
  EVENTS_IMAGES: 'images/events',
  ACTIVITIES_IMAGES: 'images/activities',
  GENERAL_IMAGES: 'images/general',
} as const;

// Note: All images are now managed through Firebase Storage
// No local images should be stored in the repository

export interface ImageInfo {
  id: string;
  name: string;
  url: string;
  path: string;
  size?: number;
  type?: string;
  uploadedAt: Date;
  isLocal?: boolean;
}

// Upload image to Firebase Storage
export const uploadImage = async (
  file: File,
  category: keyof typeof STORAGE_PATHS = 'GENERAL_IMAGES',
  customName?: string
): Promise<ImageInfo> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = customName 
      ? `${customName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`
      : `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    // Create storage reference
    const storageRef = ref(storage, `${STORAGE_PATHS[category]}/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      id: snapshot.ref.fullPath,
      name: fileName,
      url: downloadURL,
      path: snapshot.ref.fullPath,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      isLocal: false,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

// Delete image from Firebase Storage
export const deleteImage = async (imagePath: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

// List all images in a category
export const listImages = async (category: keyof typeof STORAGE_PATHS): Promise<ImageInfo[]> => {
  try {
    const listRef = ref(storage, STORAGE_PATHS[category]);
    const result = await listAll(listRef);
    
    const images = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          id: itemRef.fullPath,
          name: itemRef.name,
          url,
          path: itemRef.fullPath,
          uploadedAt: new Date(), // Firebase doesn't provide creation date easily
          isLocal: false,
        };
      })
    );
    
    return images;
  } catch (error) {
    console.error('Error listing images:', error);
    return [];
  }
};

// Get all available images from Firebase Storage
export const getAllAvailableImages = async (): Promise<ImageInfo[]> => {
  try {
    // Get all uploaded images from different categories
    const uploadedNews = await listImages('NEWS_IMAGES');
    const uploadedEvents = await listImages('EVENTS_IMAGES');
    const uploadedActivities = await listImages('ACTIVITIES_IMAGES');
    const uploadedGeneral = await listImages('GENERAL_IMAGES');
    
    return [
      ...uploadedNews,
      ...uploadedEvents,
      ...uploadedActivities,
      ...uploadedGeneral,
    ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  } catch (error) {
    console.error('Error fetching images from Firebase Storage:', error);
    return [];
  }
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'サポートされていないファイル形式です。JPEG、PNG、GIF、WebPのみ対応しています。'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。'
    };
  }
  
  return { valid: true };
};

// Generate optimized image URL (for future use with image optimization services)
export const getOptimizedImageUrl = (originalUrl: string, width?: number, height?: number): string => {
  // For Firebase Storage URLs, we could add transformation parameters in the future
  // For now, return the original URL
  return originalUrl;
};
