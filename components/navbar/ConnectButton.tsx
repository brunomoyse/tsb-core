"use client";
import { useSelector } from 'react-redux';

const ConnectButton: React.FC = () => {
    const userConnected = true;

    return (
        <button
            data-test="connect-btn"
            type="button"
            aria-label="user-status"
            className={`flex items-center justify-center rounded-full h-9 w-36 text-off-white font-semibold text-sm 
                        ${userConnected ? 'bg-tsb-red hover:bg-tsb-red-darker' : 'bg-softPink hover:bg-tsb-red'}`}
        >
            {userConnected ? 'Connected' : 'Connect'}
        </button>
    );
}

export default ConnectButton;
