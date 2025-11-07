"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Modal from "@/components/common/modals/Modal";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface DraftModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateDraft: (formData: FormData, script: string) => Promise<void>;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const DraftModal: React.FC<DraftModalProps> = ({ visible, onClose, onCreateDraft }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [script, setScript] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) {
      formRef.current?.reset();
      setScript("");
    }
  }, [visible]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    setIsSubmitting(true);
    try {
      await onCreateDraft(formData, script);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
        {/* Left Column: Form */}
        <div className="md:w-1/2 p-4">
          <div className="sticky top-0 flex justify-between items-center bg-white pb-2 border-b">
            <h3 className="text-lg font-bold">Create Draft</h3>
            <button
              type="button"
              onClick={handleClose}
              className="rounded border px-3 py-1 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1">
                Title / Idea *
              </label>
              <input
                id="title"
                name="title"
                required
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                placeholder="Enter draft title"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-xs font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="mt-1 w-full rounded border px-2 py-2 text-sm h-40 resize-none"
                placeholder="Add a description for this draft"
              />
            </div>
            <div>
              <label htmlFor="contentType" className="block text-xs font-medium mb-1">
                Content Type *
              </label>
              <select
                id="contentType"
                name="contentType"
                defaultValue="Photo"
                required
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
              >
                <option value="Photo">Photo</option>
                <option value="reel">Reel</option>
                <option value="carousel">Carousel</option>
                <option value="video">Video</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Draft"}
            </button>
          </form>
        </div>

        {/* Right Column: Script Editor */}
        <div className="md:w-1/2 p-4 flex flex-col">
          <h4 className="text-sm font-bold mb-2">Script</h4>
          <div className="flex-1 border border-gray-300 rounded overflow-hidden">
            <ReactQuill
              value={script}
              onChange={setScript}
              modules={quillModules}
              theme="snow"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DraftModal;
