"use client";
import { useSelector } from 'react-redux';

const ConnectButton: React.FC = () => {
    const userConnected = true;

    return (
        <button
            data-test="connect-btn"
            type="button"
            aria-label="user-status"
            className={`flex items-center justify-center rounded-full h-9 w-36 text-offWhite font-semibold text-sm 
                        ${userConnected ? 'bg-coralPink hover:bg-coralPink-darker' : 'bg-softPink hover:bg-coralPink'}`}
        >
            {userConnected ? 'Connected' : 'Connect'}
        </button>
    );
}

export default ConnectButton;
