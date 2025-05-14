"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

export type TabItem = {
  title?: string;
  icon?: LucideIcon;
  type: 'tab' | 'separator';
};

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
  defaultSelected?: number;
}

export function ExpandableTabs({
  tabs,
  className = '',
  activeColor = 'text-blue-500',
  onChange,
  defaultSelected = 0,
}: ExpandableTabsProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(defaultSelected);

  const handleClick = (index: number) => {
    setSelectedIndex(index);
    onChange?.(index);
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {tabs.map((tab, index) => {
        if (tab.type === 'separator') {
          return (
            <div
              key={`separator-${index}`}
              className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"
            />
          );
        }

        const Icon = tab.icon;
        const isSelected = selectedIndex === index;

        return (
          <button
            key={tab.title}
            onClick={() => handleClick(index)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isSelected
                ? `${activeColor} bg-blue-50 dark:bg-blue-900/20`
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {Icon && <Icon className="h-5 w-5 mr-2" />}
            {tab.title}
          </button>
        );
      })}
    </div>
  );
} 