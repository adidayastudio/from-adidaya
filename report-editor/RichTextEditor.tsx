"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Code from "@tiptap/extension-code";
import Blockquote from "@tiptap/extension-blockquote";

import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Heading2,
    Heading3,
    Quote,
    List,
    ListOrdered,
    Minus,
    Code as CodeIcon,
    SquareCode,
    Image as ImageIcon,
    Link as LinkIcon,
} from "lucide-react";

type Props = {
    value: string;
    onChange: (v: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);

    /* EDITOR INITIALIZATION */
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                blockquote: false,
            }),

            Placeholder.configure({
                placeholder: "Write your project description…",
            }),

            Underline,
            Blockquote,
            Code,

            TextAlign.configure({
                types: ["paragraph", "heading"],
            }),

            LinkExtension.configure({
                openOnClick: false,
            }),

            Image.configure({ inline: true }),
        ],

        content: value || "",
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },

        editorProps: {
            attributes: {
                class: "prose prose-neutral max-w-none min-h-[260px] text-[15px] leading-relaxed focus:outline-none px-4 py-4",
            },
        },

        immediatelyRender: false,
    });

    /* IMAGE HANDLING */
    async function handleChooseImage() {
        const url = prompt("Enter image URL:");
        if (url) {
            editor?.chain().focus().setImage({ src: url }).run();
        }
    }

    if (!editor) {
        return <p className="text-neutral-400 p-4">Loading editor…</p>;
    }

    /* TOOLBAR BUTTON */
    const Btn = ({
        active,
        onClick,
        icon,
        disabled,
    }: {
        active?: boolean;
        onClick: () => void;
        icon: React.ReactNode;
        disabled?: boolean;
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
        p-2 rounded-lg transition-colors
        ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
        >
            {icon}
        </button>
    );

    return (
        <div>
            {/* TOOLBAR - Sticky/Floating */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 p-2 border-b border-neutral-200 bg-white/95 backdrop-blur-sm shadow-sm">
                <Btn
                    icon={<Bold size={16} />}
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                />

                <Btn
                    icon={<Italic size={16} />}
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                />

                <Btn
                    icon={<UnderlineIcon size={16} />}
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                />

                <div className="w-px h-6 bg-neutral-200 mx-1" />

                <Btn
                    icon={<Heading2 size={16} />}
                    active={editor.isActive("heading", { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                />

                <Btn
                    icon={<Heading3 size={16} />}
                    active={editor.isActive("heading", { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                />

                <div className="w-px h-6 bg-neutral-200 mx-1" />

                <Btn
                    icon={<Quote size={16} />}
                    active={editor.isActive("blockquote")}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                />

                <Btn
                    icon={<List size={16} />}
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                />

                <Btn
                    icon={<ListOrdered size={16} />}
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                />

                <Btn
                    icon={<Minus size={16} />}
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                />

                <div className="w-px h-6 bg-neutral-200 mx-1" />

                <Btn
                    icon={<CodeIcon size={16} />}
                    active={editor.isActive("code")}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                />

                <Btn
                    icon={<SquareCode size={16} />}
                    active={editor.isActive("codeBlock")}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                />

                <Btn
                    icon={<LinkIcon size={16} />}
                    onClick={() => {
                        const url = prompt("Enter URL");
                        if (url) {
                            editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                />

                <Btn
                    icon={<ImageIcon size={16} />}
                    onClick={handleChooseImage}
                    disabled={uploading}
                />
            </div>

            {/* EDITOR */}
            <EditorContent editor={editor} />
        </div>
    );
}
