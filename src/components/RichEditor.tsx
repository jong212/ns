'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { uploadImageForPost } from '@/lib/storage';

interface RichEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

// 간단한 리치 텍스트 에디터 (bold, italic, underline, bullet/number list, code)
export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const execWrap = useCallback((cmd: string, arg?: string) => {
    try {
      document.execCommand(cmd, false, arg);
    } catch {}
  }, []);

  const onInput = useCallback<React.FormEventHandler<HTMLDivElement>>((e) => {
    onChange((e.target as HTMLDivElement).innerHTML);
  }, [onChange]);

  const setPlainText = useCallback(() => {
    try {
      const div = document.getElementById('rich-editor-content');
      if (div) onChange(div.innerHTML);
    } catch {}
  }, [onChange]);

  const toolbar = useMemo(() => (
    <div className="flex flex-wrap gap-1 p-2 border rounded-t-lg bg-gray-50 border-gray-200 dark:bg-[#121417] dark:border-gray-700">
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => execWrap('bold')}>B</button>
      <button type="button" className="px-2 py-1 text-sm italic hover:bg-gray-100 rounded" onClick={() => execWrap('italic')}>I</button>
      <button type="button" className="px-2 py-1 text-sm underline hover:bg-gray-100 rounded" onClick={() => execWrap('underline')}>U</button>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => execWrap('insertUnorderedList')}>• 목록</button>
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => execWrap('insertOrderedList')}>1. 목록</button>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => execWrap('formatBlock', '<pre>')}>{'</>'}</button>
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => execWrap('removeFormat')}>서식 해제</button>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const url = await uploadImageForPost(file);
          // 커서 위치에 이미지 태그 삽입
          document.execCommand('insertHTML', false, `<img src="${url}" alt="image" />`);
          const div = document.getElementById('rich-editor-content');
          if (div) onChange(div.innerHTML);
        } catch {
          alert('이미지 업로드 실패');
        } finally {
          setUploading(false);
          if (inputRef.current) inputRef.current.value = '';
        }
      }} />
      <button type="button" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? '업로드 중…' : '이미지'}
      </button>
    </div>
  ), [execWrap]);

  return (
    <div className="w-full">
      {toolbar}
      <div
        id="rich-editor-content"
        className="w-full min-h-56 p-4 border-x border-b rounded-b-lg bg-white prose max-w-none focus:outline-none border-gray-200 dark:bg-[#0f1115] dark:text-gray-200 dark:prose-invert dark:border-gray-700"
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onPaste={(e) => {
          // 일반 커뮤처럼 붙여넣기 시 서식 제거
          e.preventDefault();
          const text = e.clipboardData?.getData('text/plain') || '';
          document.execCommand('insertText', false, text);
        }}
        onBlur={setPlainText}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
      {(!value && placeholder) ? (
        <div className="-mt-[3.25rem] pointer-events-none select-none text-gray-400 p-3">{placeholder}</div>
      ) : null}
      <p className="mt-1 text-xs text-gray-400">서식 포함 내용은 HTML로 저장됩니다.</p>
    </div>
  );
}


