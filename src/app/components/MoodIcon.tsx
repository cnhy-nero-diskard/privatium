import React from 'react';
import { Smile, Laugh, Meh, Frown, Angry } from 'lucide-react';
import { getMoodDefinition, type MoodDefinition } from '@/utils/moodUtils';

interface MoodIconProps {
  mood: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Map mood icon names to Lucide React Icons
const iconMap = {
  FaRegLaugh: Laugh,
  FaRegSmile: Smile,
  FaRegMeh: Meh,
  FaRegFrown: Frown,
  FaRegAngry: Angry,
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const emojiSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const MoodIcon: React.FC<MoodIconProps> = ({ 
  mood, 
  size = 'md', 
  showLabel = false, 
  className = '' 
}) => {
  if (!mood) {
    return showLabel ? (
      <span className={`italic text-gray-400 ${className}`}>No mood</span>
    ) : null;
  }

  const moodDef = getMoodDefinition(mood);

  if (!moodDef) {
    // Fallback for unknown moods
    const IconComponent = Meh;
    return (
      <span className={`text-gray-400 ${className}`}>
        <IconComponent className={`inline ${sizeClasses[size]}`} />
        {showLabel && <span className="ml-1">{mood}</span>}
      </span>
    );
  }

  const IconComponent = iconMap[moodDef.icon as keyof typeof iconMap] || Meh;

  return (
    <span className={`inline-flex items-center gap-1 ${moodDef.color} ${className}`}>
      <IconComponent className={sizeClasses[size]} />
      {showLabel && <span>{moodDef.label}</span>}
    </span>
  );
};

// Convenience component that always shows the label
export const MoodWithLabel: React.FC<{ mood: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  mood, 
  size = 'md', 
  className = '' 
}) => {
  return <MoodIcon mood={mood} size={size} showLabel={true} className={className} />;
};

// Legacy moodIcon function for backward compatibility
export const moodIcon = (mood: string | null) => {
  return <MoodIcon mood={mood} showLabel={false} />;
};

export default MoodIcon;
