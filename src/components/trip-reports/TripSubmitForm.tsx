'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import imageCompression from 'browser-image-compression';
import { 
  MdFormatBold, 
  MdFormatItalic, 
  MdFormatUnderlined,
  MdFormatStrikethrough,
  MdTitle,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdCode,
  MdLink,
  MdImage,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
} from 'react-icons/md';
import LocationPicker from './LocationPicker';

interface TripSubmitFormProps {
  initialData?: any;
  editToken?: string | null;
  tripId?: string | null;
}

export default function TripSubmitForm({ initialData, editToken, tripId }: TripSubmitFormProps = {}) {
  const router = useRouter();
  const isEditMode = !!initialData && !!editToken && !!tripId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Store mapping of image URLs to asset IDs
  const imageAssetMap = useRef<Map<string, string>>(new Map());

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    authorName: initialData?.authorName || '',
    authorEmail: initialData?.authorEmail || '',
    tripDate: initialData?.tripDate 
      ? new Date(initialData.tripDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    locationLat: initialData?.locationPin?.lat || null as number | null,
    locationLng: initialData?.locationPin?.lng || null as number | null,
    tags: initialData?.tags || [] as string[],
  });

  const availableTags = [
    'trail-running',
    'hiking',
    'mountaineering',
    'climbing',
    'ice-climb',
    'scramble',
    'bike',
    'ski-split-tour',
    'backpacking',
    'camping',
    'snowshoeing',
    'rock-climbing',
  ];

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t: string) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Handle image upload with compression
  const handleImageUpload = useCallback(async (file: File) => {
    setUploadingImage(true);
    setError(null);

    try {
      // Compress image if over 4MB
      let fileToUpload = file;
      const maxSizeMB = 4;
      
      if (file.size > maxSizeMB * 1024 * 1024) {
        const options = {
          maxSizeMB: maxSizeMB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        fileToUpload = await imageCompression(file, options);
      }

      // Upload to Sanity
      const uploadFormData = new FormData();
      uploadFormData.append('file', fileToUpload);

      const uploadResponse = await fetch('/api/trip-reports/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        let errorMessage = 'Failed to upload image';
        try {
          const errorData = await uploadResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Upload failed: ${uploadResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const uploadData = await uploadResponse.json();
      const url = uploadData.data.url;
      const assetId = uploadData.data.assetId;
      
      // Store mapping for later use
      imageAssetMap.current.set(url, assetId);
      
      return {
        url,
        assetId,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploadingImage(false);
    }
  }, []);

  // Convert Portable Text to TipTap JSON (for editing)
  const portableTextToTipTap = useCallback((blocks: any[]): any => {
    if (!blocks || blocks.length === 0) return { type: 'doc', content: [] };

    const content: any[] = [];

    blocks.forEach((block) => {
      if (block._type === 'block') {
        const nodeType = block.style === 'normal' ? 'paragraph' :
                        block.style?.startsWith('h') ? 'heading' :
                        block.style === 'blockquote' ? 'blockquote' : 'paragraph';

        const children: any[] = [];
        if (block.children) {
          block.children.forEach((child: any) => {
            if (child._type === 'span' && child.text) {
              const marks: any[] = [];
              if (child.marks) {
                child.marks.forEach((mark: any) => {
                  if (mark === 'strong') marks.push({ type: 'bold' });
                  else if (mark === 'em') marks.push({ type: 'italic' });
                  else if (mark === 'underline') marks.push({ type: 'underline' });
                  else if (typeof mark === 'object' && mark._type === 'link') {
                    marks.push({ type: 'link', attrs: { href: mark.href } });
                  }
                });
              }
              children.push({
                type: 'text',
                text: child.text,
                marks: marks.length > 0 ? marks : undefined,
              });
            }
          });
        }

        if (nodeType === 'heading') {
          const level = parseInt(block.style.replace('h', '')) || 1;
          content.push({
            type: 'heading',
            attrs: { level },
            content: children,
          });
        } else {
          content.push({
            type: nodeType,
            content: children.length > 0 ? children : undefined,
          });
        }
      } else if (block._type === 'image' && block.asset) {
        // For images, we'll need to fetch the URL
        // For now, we'll skip images in edit mode or handle them separately
        content.push({
          type: 'paragraph',
          content: [],
        });
      }
    });

    return { type: 'doc', content };
  }, []);

  // TipTap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            'data-asset-id': {
              default: null,
              parseHTML: element => element.getAttribute('data-asset-id'),
              renderHTML: attributes => {
                if (!attributes['data-asset-id']) {
                  return {};
                }
                return {
                  'data-asset-id': attributes['data-asset-id'],
                };
              },
            },
          };
        },
      }).configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg selectable-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-green hover:underline',
        },
      }),
    ],
    content: isEditMode && initialData?.body ? portableTextToTipTap(initialData.body) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
      },
      handleClick: (view: any, pos: number, event: MouseEvent) => {
        // Allow clicking on images to select them
        const node = view.state.doc.nodeAt(pos);
        if (node && node.type.name === 'image') {
          const tr = view.state.tr.setSelection(
            view.state.schema.resolve(pos).create()
          );
          view.dispatch(tr);
          return true;
        }
        return false;
      },
      handleDrop: (view: any, event: DragEvent, slice: any, moved: boolean) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file).then(({ url, assetId }) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coordinates) {
                const node = schema.nodes.image.create({ 
                  src: url,
                  'data-asset-id': assetId,
                });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view: any, event: ClipboardEvent, slice: any) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageUpload(file).then(({ url, assetId }) => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ 
                  src: url,
                  'data-asset-id': assetId,
                });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              });
            }
            return true;
          }
        }
        return false;
      },
    },
  }, [isEditMode, initialData, portableTextToTipTap]);

  // Update editor content when initialData loads (for edit mode)
  useEffect(() => {
    if (isEditMode && initialData?.body && editor) {
      const tiptapContent = portableTextToTipTap(initialData.body);
      editor.commands.setContent(tiptapContent);
    }
  }, [isEditMode, initialData, editor, portableTextToTipTap]);

  // Add image button handler
  const addImage = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;

      try {
        const { url, assetId } = await handleImageUpload(file);
        const imageNode = editor.chain().focus().setImage({ src: url }).run();
        // Store asset ID - we'll extract it from the image URL or store it separately
        // For now, we'll handle this in the conversion function
      } catch (err) {
        // Error already handled in handleImageUpload
      }
    };
  }, [editor, handleImageUpload]);

  // Convert TipTap JSON to portable text
  const tiptapToPortableText = (json: any): any[] => {
    if (!json || !json.content) return [];

    const blocks: any[] = [];
    let keyCounter = 0;

    const processNode = (node: any): any[] => {
      const result: any[] = [];

      if (node.type === 'text') {
        const marks = node.marks?.map((mark: any) => {
          if (mark.type === 'bold') return 'strong';
          if (mark.type === 'italic') return 'em';
          if (mark.type === 'underline') return 'underline';
          if (mark.type === 'link') return `link-${keyCounter}`;
          return null;
        }).filter(Boolean) || [];

        if (node.text.trim()) {
          result.push({
            _type: 'span',
            _key: `span-${keyCounter++}`,
            text: node.text,
            marks: marks,
          });
        }
        return result;
      }

      if (node.type === 'image') {
        const imageUrl = node.attrs?.src || '';
        const assetId = imageAssetMap.current.get(imageUrl) || imageUrl;
        if (assetId) {
          result.push({
            _type: 'image',
            _key: `image-${keyCounter++}`,
            asset: {
              _type: 'reference',
              _ref: assetId,
            },
          });
        }
        return result;
      }

      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
        const children: any[] = [];
        if (node.content) {
          node.content.forEach((child: any) => {
            children.push(...processNode(child));
          });
        }

        if (children.length > 0) {
          const style = node.type === 'paragraph' ? 'normal' :
                       node.type === 'heading' ? `h${node.attrs?.level || 1}` :
                       node.type === 'blockquote' ? 'blockquote' : 'normal';

          result.push({
            _type: 'block',
            _key: `block-${keyCounter++}`,
            style: style,
            children: children,
            markDefs: [],
          });
        }
        return result;
      }

      // Process other node types
      if (node.content) {
        node.content.forEach((child: any) => {
          result.push(...processNode(child));
        });
      }

      return result;
    };

    json.content.forEach((node: any) => {
      blocks.push(...processNode(node));
    });

    return blocks;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.title || !formData.authorName || !formData.tripDate) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.locationLat === null || formData.locationLng === null) {
        throw new Error('Please select a location on the map');
      }

      // Validate email format (only for new submissions)
      if (!isEditMode) {
        if (!formData.authorEmail) {
          throw new Error('Please enter your email address');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.authorEmail)) {
          throw new Error('Please enter a valid email address');
        }
      }

      if (!editor || editor.isEmpty) {
        throw new Error('Please add some content');
      }

      // Get editor content as JSON
      const json = editor.getJSON();
      const body = tiptapToPortableText(json);

      if (body.length === 0) {
        throw new Error('Please add some content');
      }

      // Submit or update trip report
      const url = isEditMode 
        ? `/api/trip-reports/edit?token=${editToken}&id=${tripId}`
        : '/api/trip-reports/submit';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const submitResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          authorName: formData.authorName,
          ...(isEditMode ? {} : { authorEmail: formData.authorEmail }),
          tripDate: formData.tripDate,
          locationPin: {
            lat: formData.locationLat,
            lng: formData.locationLng,
          },
          body,
          tags: formData.tags,
          ...(isEditMode ? {} : { published: false }), // Start as draft only for new submissions
        }),
      });

      if (!submitResponse.ok) {
        let errorMessage = 'Failed to submit trip report';
        try {
          const errorData = await submitResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Submission failed: ${submitResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await submitResponse.json();
      
      if (isEditMode) {
        // For edits, redirect to the trip report
        router.push(`/trip-reports/${tripId}`);
      } else {
        // For new submissions, show email verification message
        setSuccess(true);
      }
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
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email!</h2>
        <p className="text-gray-600 mb-4">
          We've saved your trip report as a draft and sent a verification link to:
        </p>
        <p className="text-lg font-semibold text-brand-green mb-6">{formData.authorEmail}</p>
        <p className="text-sm text-gray-500 mb-6">
          Click the link in the email to publish your trip report. The link will expire in 24 hours.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setLoading(false);
            setError(null);
            setFormData({
              title: '',
              authorName: '',
              authorEmail: '',
              tripDate: new Date().toISOString().split('T')[0],
              locationLat: null,
              locationLng: null,
              tags: [],
            });
            if (editor) {
              editor.commands.clearContent();
            }
          }}
          className="px-6 py-3 bg-brand-green text-white rounded-full font-semibold hover:bg-brand-green-dark transition-colors"
        >
          Submit Another
        </button>
      </motion.div>
    );
  }

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          {error}
        </div>
      )}

      {uploadingImage && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
          Compressing and uploading image...
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
          placeholder="A few words to describe your trip"
        />
      </div>

      {/* Author Name */}
      <div>
        <label htmlFor="authorName" className="block text-sm font-semibold text-gray-900 mb-2">
          Your Name *
        </label>
        <input
          type="text"
          id="authorName"
          name="authorName"
          required
          value={formData.authorName}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
          placeholder="Your name"
        />
      </div>

      {/* Author Email - only show for new submissions */}
      {!isEditMode && (
        <div>
          <label htmlFor="authorEmail" className="block text-sm font-semibold text-gray-900 mb-2">
            Your Email *
          </label>
          <input
            type="email"
            id="authorEmail"
            name="authorEmail"
            required
            value={formData.authorEmail}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="your@email.com"
          />
          <p className="mt-2 text-xs text-gray-500">
            We'll send you a verification link to publish your trip report
          </p>
        </div>
      )}

      {/* Trip Date */}
      <div>
        <label htmlFor="tripDate" className="block text-sm font-semibold text-gray-900 mb-2">
          Trip Date *
        </label>
        <input
          type="date"
          id="tripDate"
          name="tripDate"
          required
          value={formData.tripDate}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      {/* Location Pin */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Location *
        </label>
        <LocationPicker
          lat={formData.locationLat}
          lng={formData.locationLng}
          onLocationChange={(lat, lng) => {
            // Handle clear (NaN values)
            if (isNaN(lat) || isNaN(lng)) {
              setFormData(prev => ({
                ...prev,
                locationLat: null,
                locationLng: null,
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                locationLat: lat,
                locationLng: lng,
              }));
            }
          }}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isSelected = formData.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            );
          })}
        </div>
        {formData.tags.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Selected: {formData.tags.join(', ')}
          </p>
        )}
      </div>

      {/* Rich Text Editor */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Your Story *
        </label>
        
        {/* Toolbar - Google Docs style */}
        <div className="border border-gray-300 rounded-t-xl bg-gray-50 p-2 flex items-center gap-1 flex-wrap">
          {/* Text Formatting Group */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bold') ? 'bg-gray-300' : ''
              }`}
              title="Bold (Ctrl+B)"
            >
              <MdFormatBold className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('italic') ? 'bg-gray-300' : ''
              }`}
              title="Italic (Ctrl+I)"
            >
              <MdFormatItalic className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('underline') ? 'bg-gray-300' : ''
              }`}
              title="Underline (Ctrl+U)"
            >
              <MdFormatUnderlined className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('strike') ? 'bg-gray-300' : ''
              }`}
              title="Strikethrough"
            >
              <MdFormatStrikethrough className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Headings Group */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-200 transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
              }`}
              title="Heading 1"
            >
              H₁
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-200 transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
              }`}
              title="Heading 2"
            >
              H₂
            </button>
          </div>

          {/* Lists Group */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bulletList') ? 'bg-gray-300' : ''
              }`}
              title="Bullet List"
            >
              <MdFormatListBulleted className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('orderedList') ? 'bg-gray-300' : ''
              }`}
              title="Numbered List"
            >
              <MdFormatListNumbered className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Alignment Group */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
              }`}
              title="Align Left"
            >
              <MdFormatAlignLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
              }`}
              title="Align Center"
            >
              <MdFormatAlignCenter className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
              }`}
              title="Align Right"
            >
              <MdFormatAlignRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Other Formatting */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('blockquote') ? 'bg-gray-300' : ''
              }`}
              title="Quote"
            >
              <MdFormatQuote className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('codeBlock') ? 'bg-gray-300' : ''
              }`}
              title="Code Block"
            >
              <MdCode className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Links & Images */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('link') ? 'bg-gray-300' : ''
              }`}
              title="Insert Link"
            >
              <MdLink className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={addImage}
              className="p-2 rounded hover:bg-gray-200 transition-colors"
              title="Insert Image"
            >
              <MdImage className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="border-x border-b border-gray-300 rounded-b-xl overflow-hidden bg-white">
          <EditorContent editor={editor} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Tip: Drag & drop images or paste them directly. Images over 4MB will be automatically compressed.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || uploadingImage}
        className="w-full bg-brand-green text-white py-4 rounded-xl font-semibold text-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading 
          ? (isEditMode ? 'Updating...' : 'Submitting...') 
          : uploadingImage 
            ? 'Uploading Image...' 
            : (isEditMode ? 'Update Trip Report' : 'Submit Trip Report')
        }
      </button>
    </form>
  );
}
