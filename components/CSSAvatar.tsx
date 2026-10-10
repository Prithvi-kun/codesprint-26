export default function CSSAvatar({ 
  seed = 'Felix', 
  isWalking = false, 
  isSitting = false, 
  direction = 'down', // 'down', 'up', 'left', 'right'
  className = ''
}: { 
  seed?: string, 
  isWalking?: boolean, 
  isSitting?: boolean, 
  direction?: 'up' | 'down' | 'left' | 'right',
  className?: string
}) {
  // Generate a stable color based on the seed string
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return hash;
  }
  const colorHash = Math.abs(hashCode(seed))
  const hue = colorHash % 360
  
  const shirtColor = `hsl(${hue}, 70%, 40%)`
  const pantsColor = `hsl(${(hue + 180) % 360}, 60%, 25%)`
  const skinTone = colorHash % 2 === 0 ? '#fcd5b4' : '#8d5524'

  // Z-index sorting based on direction
  const isUp = direction === 'up'
  const isSide = direction === 'left' || direction === 'right'
  const isLeft = direction === 'left'

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {/* Container scaled down to a relative 40x40 bounding box */}
      <div style={{ width: '40px', height: '40px', transform: 'scale(1)', transformOrigin: 'center' }} className="relative flex items-center justify-center">
        {/* The Character Wrapper */}
        <div 
          className={`absolute w-[32px] h-[36px] transition-transform duration-200
            ${isLeft ? '-scale-x-100' : 'scale-x-100'} 
            ${isWalking && isSide ? 'animate-bob' : ''}
          `}
          style={{ top: '2px' }}
        >
        
        {/* HEAD */}
        <div 
          className="absolute w-[18px] h-[18px] border-[2px] border-black rounded-[6px] z-30"
          style={{ top: '2px', left: '7px', backgroundColor: skinTone }}
        >
          {/* Eyes (only show if facing down or side) */}
          {!isUp && (
            <div className="absolute top-[4px] w-full flex justify-center gap-[2px]">
              <div className="w-[3px] h-[3px] bg-black rounded-full" />
              {!isSide && <div className="w-[3px] h-[3px] bg-black rounded-full" />}
            </div>
          )}
          {/* Hair (simple block) */}
          <div className="absolute -top-[4px] -left-[2px] w-[20px] h-[6px] bg-[#3e2723] rounded-t-[6px] border-black border-[2px]" />
        </div>

        {/* BODY */}
        <div 
          className="absolute w-[16px] h-[14px] border-[2px] border-black rounded-[4px] z-20"
          style={{ top: '16px', left: '8px', backgroundColor: shirtColor }}
        />

        {/* LEFT ARM */}
        <div 
          className={`absolute w-[6px] h-[12px] border-[2px] border-black rounded-[3px] origin-top
            ${isWalking ? 'animate-swing-alt' : ''}
          `}
          style={{ 
            top: '16px', left: isSide ? '13px' : '3px', 
            backgroundColor: skinTone,
            zIndex: isUp ? 10 : (isSide ? 30 : 25)
          }}
        >
          <div className="absolute top-0 left-0 w-full h-[6px] bg-black/20" /> {/* Sleeve */}
        </div>

        {/* RIGHT ARM */}
        {!isSide && (
          <div 
            className={`absolute w-[6px] h-[12px] border-[2px] border-black rounded-[3px] origin-top z-25
              ${isWalking ? 'animate-swing' : ''}
            `}
            style={{ top: '16px', left: '23px', backgroundColor: skinTone }}
          >
            <div className="absolute top-0 left-0 w-full h-[6px] bg-black/20" /> {/* Sleeve */}
          </div>
        )}

        {/* LEFT LEG */}
        <div 
          className={`absolute w-[6px] h-[10px] border-[2px] border-black rounded-[2px] origin-top z-10
            ${isWalking ? 'animate-swing' : ''}
            ${isSitting ? 'transform -rotate-90 -translate-y-1' : ''}
          `}
          style={{ top: '28px', left: isSide ? '13px' : '9px', backgroundColor: pantsColor }}
        />

        {/* RIGHT LEG */}
        {!isSide && (
          <div 
            className={`absolute w-[6px] h-[10px] border-[2px] border-black rounded-[2px] origin-top z-10
              ${isWalking ? 'animate-swing-alt' : ''}
              ${isSitting ? 'transform -rotate-90 -translate-y-1' : ''}
            `}
            style={{ top: '28px', left: '17px', backgroundColor: pantsColor }}
          />
        )}
      </div>
      </div>
    </div>
  )
}
