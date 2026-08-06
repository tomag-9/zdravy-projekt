const DietVariantHint = ({ kind, menuVariant }: { kind: string; menuVariant?: string }) => {
    if (kind !== "diets" || !menuVariant) return null;
    return (
        <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>
            (pripravuje sa ako Menu {menuVariant})
        </span>
    );
};

export default DietVariantHint;
