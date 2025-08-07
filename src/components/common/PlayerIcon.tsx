import React from 'react';
import { Player } from '../../services/playerService';

interface PlayerIconProps {
  player: Player;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const PlayerIcon: React.FC<PlayerIconProps> = ({ 
  player, 
  size = 'medium', 
  className = '' 
}) => {
  const iconPath = `/icons/stock/${player.mainCharacter.icon_name}${player.skin}.png`;
  
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };
  
  return (
    <img
      src={iconPath}
      alt={`${player.mainCharacter.name} (${player.name})`}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      onError={(e) => {
        // Fallback to a default icon if the specific icon doesn't exist
        const target = e.target as HTMLImageElement;
        target.src = '/icons/stock/default1.png';
      }}
    />
  );
};

export default PlayerIcon;
