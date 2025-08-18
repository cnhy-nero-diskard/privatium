import React, { useCallback, useMemo } from 'react';
import isHotkey from 'is-hotkey';
import { Editable, withReact, useSlate, Slate, ReactEditor } from 'slate-react';
import { 
  Editor, 
  Transforms, 
  createEditor, 
  Element as SlateElement, 
  Descendant,
  BaseEditor,
  BaseElement
} from 'slate';
import { withHistory } from 'slate-history';

// Import CSS for dark mode fixes
import './rich-text-editor-darkmode-fix.css';

// Update is-hotkey type definition
declare module 'is-hotkey' {
  export default function isHotkey(
    hotkey: string | Record<string, boolean>, 
    event: KeyboardEvent | React.KeyboardEvent
  ): boolean;
}

// Declare module augmentations for TypeScript
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Define custom element types
type CustomElement = {
  type?: string;
  align?: string;
  children: CustomText[];
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
};

// Editor props type
interface RichTextEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
}
import { 
  Bold, Italic, Underline, Code as CodeIcon, List, ListOrdered, AlignLeft, 
  AlignCenter, AlignRight, AlignJustify, Quote, Type, Heading1, Heading2,
  Minus
} from 'lucide-react';

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  const handleDOMBeforeInput = useCallback(
    (e: InputEvent) => {
      // Handle special key combinations (like asterisks for bold, etc.)
      // This is optional but can make the editor feel more natural
    },
    [editor]
  );

  // Check if the document has a dark class anywhere in the parent tree
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  // Check initial dark mode
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const checkDarkMode = () => {
        const isDark = 
          document.documentElement.classList.contains('dark') || 
          document.body.classList.contains('dark') ||
          document.documentElement.getAttribute('data-theme') === 'dark';
        setIsDarkMode(isDark);
      };
      
      // Check initial state
      checkDarkMode();
      
      // Set up a MutationObserver to watch for class changes on html and body
      const observer = new MutationObserver(checkDarkMode);
      
      // Start observing
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class', 'data-theme']
      });
      
      observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['class']
      });
      
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className={`rich-editor-container ${isDarkMode ? 'dark' : ''}`}>
      <Slate editor={editor} initialValue={value} onChange={onChange}>
        <div className="toolbar">
          <ToolbarGroup>
            <MarkButton format="bold" icon={<Bold size={16} />} />
            <MarkButton format="italic" icon={<Italic size={16} />} />
            <MarkButton format="underline" icon={<Underline size={16} />} />
            <MarkButton format="code" icon={<CodeIcon size={16} />} />
          </ToolbarGroup>
          <ToolbarGroup>
            <BlockButton format="heading-one" icon={<Heading1 size={16} />} />
            <BlockButton format="heading-two" icon={<Heading2 size={16} />} />
            <BlockButton format="block-quote" icon={<Quote size={16} />} />
          </ToolbarGroup>
          <ToolbarGroup>
            <BlockButton format="numbered-list" icon={<ListOrdered size={16} />} />
            <BlockButton format="bulleted-list" icon={<List size={16} />} />
          </ToolbarGroup>
          <ToolbarGroup>
            <BlockButton format="left" icon={<AlignLeft size={16} />} />
            <BlockButton format="center" icon={<AlignCenter size={16} />} />
            <BlockButton format="right" icon={<AlignRight size={16} />} />
            <BlockButton format="justify" icon={<AlignJustify size={16} />} />
          </ToolbarGroup>
          <ToolbarGroup>
            <BlockButton format="divider" icon={<Minus size={16} />} />
          </ToolbarGroup>
        </div>
        
        <div className="editor-content">
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Write your entry here..."
            spellCheck
            autoFocus
            onDOMBeforeInput={handleDOMBeforeInput}
            onKeyDown={event => {
              for (const hotkey in HOTKEYS) {
                if (isHotkey(hotkey, event)) {
                  event.preventDefault();
                  const mark = HOTKEYS[hotkey];
                  toggleMark(editor, mark);
                }
              }
            }}
            className="p-4 min-h-[250px] focus:outline-none rounded-lg text-gray-900 dark:text-gray-100 transition-colors duration-200"
          />
        </div>
      </Slate>
    </div>
  );
};

const toggleBlock = (editor: any, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = ['numbered-list', 'bulleted-list'].includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n: any) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      ['numbered-list', 'bulleted-list'].includes(n.type as string),
    split: true,
  });

  let newProperties: Partial<CustomElement> = {};
  if (format === 'left' || format === 'right' || format === 'center' || format === 'justify') {
    newProperties = { align: isActive ? undefined : format };
  } else {
    newProperties = { type: isActive ? 'paragraph' : isList ? 'list-item' : format };
  }

  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: any, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor: any, format: string) => {
  if (['left', 'center', 'right', 'justify'].includes(format)) {
    // For alignment we check the `align` property
    const [match] = Editor.nodes(editor, {
      match: (n: any) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n.align === format,
    });
    return !!match;
  }

  const [match] = Editor.nodes(editor, {
    match: (n: any) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === format,
  });
  
  return !!match;
};

const isMarkActive = (editor: any, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

type ElementProps = {
  attributes: any;
  children: React.ReactNode;
  element: CustomElement;
};

const Element = ({ attributes, children, element }: ElementProps) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote 
          style={style} 
          className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2 text-gray-700 dark:text-gray-300" 
          {...attributes}
        >
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul style={style} className="list-disc pl-10 my-2" {...attributes}>
          {children}
        </ul>
      );
    case 'heading-one':
      return (
        <h1 style={style} className="text-2xl font-bold my-2 text-gray-900 dark:text-gray-100" {...attributes}>
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 style={style} className="text-xl font-semibold my-2 text-gray-800 dark:text-gray-200" {...attributes}>
          {children}
        </h2>
      );
    case 'list-item':
      return (
        <li style={style} className="my-1" {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol style={style} className="list-decimal pl-10 my-2" {...attributes}>
          {children}
        </ol>
      );
    case 'divider':
      return (
        <div {...attributes}>
          <hr className="my-4 border-gray-300 dark:border-gray-600" />
          {children}
        </div>
      );
    default:
      return (
        <p style={style} className="my-2" {...attributes}>
          {children}
        </p>
      );
  }
};

type LeafProps = {
  attributes: any;
  children: React.ReactNode;
  leaf: CustomText;
};

const Leaf = ({ attributes, children, leaf }: LeafProps) => {
  if (leaf.bold) {
    children = <strong className="text-gray-900 dark:text-white">{children}</strong>;
  }

  if (leaf.code) {
    children = <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded font-mono text-sm">{children}</code>;
  }

  if (leaf.italic) {
    children = <em className="text-gray-800 dark:text-gray-200">{children}</em>;
  }

  if (leaf.underline) {
    children = <u className="text-gray-900 dark:text-white">{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

type ButtonProps = {
  format: string;
  icon: React.ReactNode;
};

const BlockButton = ({ format, icon }: ButtonProps) => {
  const editor = useSlate();
  return (
    <button
      className={`toolbar-btn ${isBlockActive(editor, format) ? 'active' : ''}`}
      onMouseDown={event => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {icon}
    </button>
  );
};

const MarkButton = ({ format, icon }: ButtonProps) => {
  const editor = useSlate();
  return (
    <button
      className={`toolbar-btn ${isMarkActive(editor, format) ? 'active' : ''}`}
      onMouseDown={event => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </button>
  );
};

type ToolbarGroupProps = {
  children: React.ReactNode;
};

const ToolbarGroup = ({ children }: ToolbarGroupProps) => {
  return (
    <div className="flex space-x-1 pr-2 mr-2 border-r border-gray-300 dark:border-gray-700 last:border-0">
      {children}
    </div>
  );
};

// Default initial value for the editor
export const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  } as CustomElement,
];
