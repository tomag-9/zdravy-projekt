import { ReactNode, ComponentType } from 'react';
import { Lock } from 'lucide-react';

interface MealCardProps {
    title: string;
    isActive: boolean;
    onToggle: () => void;
    copyAction?: ReactNode | null;
    statusMessage?: ReactNode | null;
    children: ReactNode;
    icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
    className?: string;
    tourId?: string;
}

const MealCard = ({
    title,
    isActive,
    onToggle,
    copyAction,
    statusMessage,
    children,
    icon: Icon,
    className,
    tourId,
}: MealCardProps) => {
    const isLocked = !isActive && !!statusMessage;

    return (
        <div
            data-tour-id={tourId}
            className={`zp-meal${isActive ? " zp-meal--active" : isLocked ? " zp-meal--locked" : ""}${className ? " " + className : ""}`}
        >
            <div className="zp-meal-head">
                <div className="zp-meal-icon">
                    <Icon style={{ width: 20, height: 20, strokeWidth: 1.8 }} />
                </div>
                <div className="zp-meal-title">
                    {title}
                </div>
                {/* Toggle switch */}
                <div
                    className={`zp-switch${isActive ? " zp-switch--on" : ""}`}
                    role="switch"
                    aria-checked={isActive}
                    onClick={onToggle}
                    style={isLocked ? { opacity: 0.6 } : {}}
                />
            </div>

            {statusMessage && (
                <div className="zp-banner zp-banner--locked" style={{ marginBottom: 16 }}>
                    <Lock style={{ width: 14, height: 14 }} />
                    {statusMessage}
                </div>
            )}

            {isActive && (
                <div className="zp-meal-body">
                    {copyAction && (
                        <div className="zp-copybar">
                            {copyAction}
                        </div>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};

export default MealCard;
