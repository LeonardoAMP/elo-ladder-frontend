import React from 'react';

interface ButtonProps {
    label: string;
    onClick: () => void;
    style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, style }) => {
    return (
        <button onClick={onClick} style={style}>
            {label}
        </button>
    );
};

export default Button;