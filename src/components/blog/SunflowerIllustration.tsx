type Props = { stage: number; animated?: boolean }

export default function SunflowerIllustration({ stage, animated = true }: Props) {
  const anim = animated ? 'transition-all duration-700' : ''

  return (
    <div className={`flex items-end justify-center select-none ${anim}`} style={{ height: 160 }}>
      <svg viewBox="0 0 120 160" width="120" height="160" xmlns="http://www.w3.org/2000/svg">
        {/* 土壤 */}
        <ellipse cx="60" cy="152" rx="38" ry="7" fill="#c4a97d" opacity="0.4" />
        <ellipse cx="60" cy="150" rx="30" ry="5" fill="#a0784a" opacity="0.5" />

        {/* 阶段 0：种子 */}
        {stage === 0 && (
          <g>
            <ellipse cx="60" cy="148" rx="10" ry="6" fill="#8B6914" />
            <ellipse cx="60" cy="146" rx="7" ry="4" fill="#A07830" />
            <ellipse cx="57" cy="145" rx="2" ry="1.5" fill="#C4A060" opacity="0.6" />
          </g>
        )}

        {/* 阶段 1：发芽 */}
        {stage >= 1 && (
          <g>
            {/* 茎（短）*/}
            <line x1="60" y1="148" x2="60" y2="128" stroke="#5a8a2a" strokeWidth="3.5" strokeLinecap="round" />
            {/* 两片小叶 */}
            <ellipse cx="52" cy="138" rx="8" ry="4" fill="#72b034" transform="rotate(-20 52 138)" />
            <ellipse cx="68" cy="136" rx="8" ry="4" fill="#72b034" transform="rotate(20 68 136)" />
            {/* 嫩芽顶 */}
            <ellipse cx="60" cy="126" rx="5" ry="7" fill="#88c840" />
          </g>
        )}

        {/* 阶段 2：长茎 */}
        {stage >= 2 && (
          <g>
            {/* 更长的茎 */}
            <line x1="60" y1="148" x2="60" y2="100" stroke="#4a7a20" strokeWidth="4" strokeLinecap="round" />
            {/* 下层叶 */}
            <ellipse cx="46" cy="138" rx="13" ry="5.5" fill="#5aaa28" transform="rotate(-25 46 138)" />
            <ellipse cx="74" cy="134" rx="13" ry="5.5" fill="#5aaa28" transform="rotate(25 74 134)" />
            {/* 上层叶 */}
            <ellipse cx="50" cy="116" rx="10" ry="4" fill="#72b034" transform="rotate(-20 50 116)" />
            <ellipse cx="70" cy="113" rx="10" ry="4" fill="#72b034" transform="rotate(20 70 113)" />
            {/* 顶部小球 */}
            <circle cx="60" cy="98" r="7" fill="#88c840" />
          </g>
        )}

        {/* 阶段 3：长叶 */}
        {stage >= 3 && stage < 4 && (
          <g>
            <line x1="60" y1="148" x2="60" y2="85" stroke="#3d6e1a" strokeWidth="4.5" strokeLinecap="round" />
            <ellipse cx="43" cy="138" rx="16" ry="6" fill="#4e9e20" transform="rotate(-28 43 138)" />
            <ellipse cx="77" cy="133" rx="16" ry="6" fill="#4e9e20" transform="rotate(28 77 133)" />
            <ellipse cx="47" cy="118" rx="14" ry="5" fill="#62b028" transform="rotate(-22 47 118)" />
            <ellipse cx="73" cy="114" rx="14" ry="5" fill="#62b028" transform="rotate(22 73 114)" />
            <ellipse cx="50" cy="100" rx="11" ry="4" fill="#72b034" transform="rotate(-15 50 100)" />
            <ellipse cx="70" cy="97" rx="11" ry="4" fill="#72b034" transform="rotate(15 70 97)" />
            {/* 花骨朵 */}
            <circle cx="60" cy="82" r="9" fill="#c8e040" />
            <circle cx="60" cy="82" r="5" fill="#a0bc28" />
          </g>
        )}

        {/* 阶段 4：花骨朵 */}
        {stage >= 4 && stage < 5 && (
          <g>
            <line x1="60" y1="148" x2="60" y2="80" stroke="#3d6e1a" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="42" cy="136" rx="17" ry="6.5" fill="#4e9e20" transform="rotate(-28 42 136)" />
            <ellipse cx="78" cy="131" rx="17" ry="6.5" fill="#4e9e20" transform="rotate(28 78 131)" />
            <ellipse cx="46" cy="115" rx="15" ry="5.5" fill="#62b028" transform="rotate(-22 46 115)" />
            <ellipse cx="74" cy="111" rx="15" ry="5.5" fill="#62b028" transform="rotate(22 74 111)" />
            {/* 花骨朵（更大）*/}
            <ellipse cx="60" cy="68" rx="11" ry="14" fill="#d4d820" />
            <ellipse cx="60" cy="72" rx="8" ry="10" fill="#b8bc18" />
            {/* 花瓣雏形 */}
            <ellipse cx="60" cy="57" rx="5" ry="8" fill="#e8e030" opacity="0.7" />
            <ellipse cx="60" cy="57" rx="5" ry="8" fill="#e8e030" opacity="0.7" transform="rotate(45 60 70)" />
            <ellipse cx="60" cy="57" rx="5" ry="8" fill="#e8e030" opacity="0.7" transform="rotate(90 60 70)" />
            <ellipse cx="60" cy="57" rx="5" ry="8" fill="#e8e030" opacity="0.7" transform="rotate(135 60 70)" />
          </g>
        )}

        {/* 阶段 5：盛开的向日葵 🌻 */}
        {stage >= 5 && (
          <g>
            <line x1="60" y1="148" x2="58" y2="72" stroke="#3d6e1a" strokeWidth="5.5" strokeLinecap="round" />
            {/* 叶子 */}
            <ellipse cx="40" cy="130" rx="18" ry="7" fill="#4e9e20" transform="rotate(-30 40 130)" />
            <ellipse cx="80" cy="124" rx="18" ry="7" fill="#4e9e20" transform="rotate(30 80 124)" />
            <ellipse cx="44" cy="108" rx="16" ry="6" fill="#62b028" transform="rotate(-22 44 108)" />
            <ellipse cx="76" cy="104" rx="16" ry="6" fill="#62b028" transform="rotate(22 76 104)" />
            {/* 花瓣（8片） */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <ellipse
                key={i}
                cx="60" cy="52"
                rx="7" ry="15"
                fill="#f5c800"
                transform={`rotate(${deg} 60 68)`}
                opacity="0.95"
              />
            ))}
            {/* 花盘 */}
            <circle cx="60" cy="68" r="18" fill="#5a3010" />
            <circle cx="60" cy="68" r="15" fill="#7a4820" />
            {/* 花盘纹理 */}
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * Math.PI * 2
              const x = 60 + Math.cos(angle) * 9
              const y = 68 + Math.sin(angle) * 9
              return <circle key={i} cx={x} cy={y} r="2" fill="#4a2808" opacity="0.7" />
            })}
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2
              const x = 60 + Math.cos(angle) * 4
              const y = 68 + Math.sin(angle) * 4
              return <circle key={i} cx={x} cy={y} r="1.5" fill="#3a1e04" opacity="0.8" />
            })}
            <circle cx="60" cy="68" r="1.5" fill="#2a1200" />
          </g>
        )}
      </svg>
    </div>
  )
}
