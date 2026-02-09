'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface TripSubmitFormProps {
  password?: string;
}

export default function TripSubmitForm({ password }: TripSubmitFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    date: new Date().toISOString().split('T')[0],
    locationName: '',
    locationRegion: '',
    description: '',
    tags: [] as string[],
    password: password || '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const availableTags = ['hiking', 'skiing', 'climbing', 'camping', 'backpacking', 'mountaineering', 'trail-running', 'biking'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (images.length + files.length > 20) {
      setError('Maximum 20 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large (max 10MB)`);
        return;
      }
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previews.push(e.target.result as string);
          if (previews.length === validFiles.length) {
            setImagePreviews(prev => [...prev, ...previews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setImages(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Upload images first
      const imageAssetIds: string[] = [];
      
      for (const image of images) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', image);
        if (formData.password) {
          uploadFormData.append('password', formData.password);
        }

        const uploadResponse = await fetch('/api/trip-reports/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageAssetIds.push(uploadData.data.assetId);
      }

      // Submit trip report
      const submitResponse = await fetch('/api/trip-reports/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author,
          date: formData.date,
          location: {
            name: formData.locationName,
            region: formData.locationRegion || undefined,
          },
          description: formData.description,
          imageAssetIds,
          tags: formData.tags,
          password: formData.password || undefined,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit trip report');
      }

      setSuccess(true);
      
      // Redirect to trip reports page after 2 seconds
      setTimeout(() => {
        router.push('/trip-reports');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 text-center"
      >
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Report Submitted!</h2>
        <p className="text-gray-600">Redirecting to trip reports...</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
          placeholder="e.g., Epic Day on Mount Washington"
        />
      </div>

      {/* Author */}
      <div>
        <label htmlFor="author" className="block text-sm font-semibold text-gray-900 mb-2">
          Your Name *
        </label>
        <input
          type="text"
          id="author"
          name="author"
          required
          value={formData.author}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
          placeholder="Your name"
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-semibold text-gray-900 mb-2">
          Trip Date *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          required
          value={formData.date}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="locationName" className="block text-sm font-semibold text-gray-900 mb-2">
            Location Name *
          </label>
          <input
            type="text"
            id="locationName"
            name="locationName"
            required
            value={formData.locationName}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="e.g., Mount Washington"
          />
        </div>
        <div>
          <label htmlFor="locationRegion" className="block text-sm font-semibold text-gray-900 mb-2">
            Region (optional)
          </label>
          <input
            type="text"
            id="locationRegion"
            name="locationRegion"
            value={formData.locationRegion}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="e.g., White Mountains, NH"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          value={formData.description}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
          placeholder="Tell us about your adventure..."
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                formData.tags.includes(tag)
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div>
        <label htmlFor="images" className="block text-sm font-semibold text-gray-900 mb-2">
          Images ({images.length}/20)
        </label>
        <input
          type="file"
          id="images"
          name="images"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password (if needed) */}
      {!password && (
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
            Password (if required)
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="Enter password if required"
          />
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-green text-white py-4 rounded-xl font-semibold text-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Trip Report'}
      </button>
    </form>
  );
}
