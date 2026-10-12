import type { Theme } from "./domain";

export const themes: {
  id: Theme;
  name: string;
  color: string;
  caption: string;
}[] = [
  {
    id: "polar",
    name: "白熊",
    color: "#23799f",
    caption: "氷の海と、のんびり白熊",
  },
  {
    id: "animals",
    name: "アニマル",
    color: "#82704b",
    caption: "パステル色の小さな仲間",
  },
  {
    id: "space",
    name: "宇宙",
    color: "#6254a5",
    caption: "星をめぐる小さな旅",
  },
  {
    id: "tropical",
    name: "南国",
    color: "#137b87",
    caption: "ヤシの木とピンクの夕空",
  },
  {
    id: "flowers",
    name: "花・海・空",
    color: "#277c79",
    caption: "白い花と、海辺のそよ風",
  },
];

/** Original vector illustrations. Reference screenshots are never distributed. */
export function ThemeArt({ theme }: { theme: Theme }) {
  return (
    <svg className="theme-art" viewBox="0 0 400 130" aria-hidden="true">
      <rect
        width="400"
        height="130"
        fill={
          theme === "space"
            ? "#242449"
            : theme === "animals"
              ? "#faf4e8"
              : theme === "tropical"
                ? "#ffdade"
                : "#dff3fa"
        }
      />
      {theme === "polar" && (
        <>
          <path d="M0 91Q90 70 180 96T400 91V130H0" fill="#78c9e2" />
          <path d="m228 108 36-36 91 12 26 30Z" fill="#fff" />
          <ellipse cx="308" cy="92" rx="35" ry="22" fill="#fff" />
          <circle cx="278" cy="78" r="20" fill="#fff" />
          <circle cx="266" cy="61" r="7" fill="#fff" />
          <circle cx="290" cy="61" r="7" fill="#fff" />
          <circle cx="273" cy="76" r="2" fill="#29495d" />
          <circle cx="285" cy="76" r="2" fill="#29495d" />
          <ellipse cx="279" cy="84" rx="4" ry="3" fill="#29495d" />
          {[35, 100, 165, 360].map((x) => (
            <path
              key={x}
              d={`M${x} 25v14m-7-7h14m-12-5 10 10m0-10-10 10`}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </>
      )}
      {theme === "animals" && (
        <>
          {[70, 200, 330].map((x, i) => (
            <g key={x} transform={`translate(${x} 72)`}>
              <circle
                cx="-20"
                cy="-21"
                r="14"
                fill={["#b9cdb6", "#dfbacc", "#b6cee4"][i]}
              />
              <circle
                cx="20"
                cy="-21"
                r="14"
                fill={["#b9cdb6", "#dfbacc", "#b6cee4"][i]}
              />
              <ellipse
                rx="33"
                ry="29"
                fill={["#b9cdb6", "#dfbacc", "#b6cee4"][i]}
              />
              <circle cx="-10" cy="-2" r="2.5" fill="#465467" />
              <circle cx="10" cy="-2" r="2.5" fill="#465467" />
              <path
                d="M-6 9q6 8 12 0"
                fill="none"
                stroke="#465467"
                strokeWidth="2"
              />
            </g>
          ))}
          <circle cx="132" cy="23" r="5" fill="#edc86e" />
          <circle cx="266" cy="108" r="6" fill="#f0b598" />
        </>
      )}
      {theme === "space" && (
        <>
          {[30, 90, 160, 215, 310, 370].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${20 + (i % 3) * 24}v10m-5-5h10`}
              stroke="#fff5c9"
            />
          ))}
          <circle cx="80" cy="86" r="26" fill="#a7bee5" />
          <ellipse
            cx="80"
            cy="86"
            rx="43"
            ry="9"
            transform="rotate(-20 80 86)"
            stroke="#ddd7f1"
            strokeWidth="4"
            fill="none"
          />
          <path d="M262 88q-5-48 22-65 28 20 22 65Z" fill="#fff" />
          <circle cx="284" cy="55" r="10" fill="#9cd7e6" />
          <path d="m273 94 11 28 11-28" fill="#efbd77" />
          <circle cx="183" cy="88" r="17" fill="#fff" />
          <rect x="171" y="80" width="24" height="15" rx="7" fill="#5b78a6" />
          <path d="M162 125v-17q21-17 42 0v17" fill="#fff" />
        </>
      )}
      {theme === "tropical" && (
        <>
          <circle cx="115" cy="43" r="19" fill="#fff0c9" />
          <path d="M0 76h400v54H0" fill="#72cccb" />
          <path d="M0 122q180-80 400-10v18H0" fill="#ffedcb" />
          <path
            d="M310 125q-33-52-20-85"
            stroke="#936c66"
            strokeWidth="8"
            fill="none"
          />
          <path
            d="M290 45q-60-52-74 0 31-15 74 0M290 45q28-61 64-33-41 6-64 33M290 45q56-26 80 18-41-17-80-18M290 45q-12-55-43-39 34 18 43 39"
            fill="#287e88"
          />
        </>
      )}
      {theme === "flowers" && (
        <>
          <path d="M0 78h400v52H0" fill="#9edce5" />
          <path
            d="M0 103q100-20 200 0t200 0"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M230 18h65q18-22 32 0h18q14 19-10 20h-98q-20 0-7-20"
            fill="#fff"
          />
          {[32, 69, 115].map((x, i) => (
            <g key={x} transform={`translate(${x} ${80 + (i % 2) * 22})`}>
              <path
                d="M0 0v60m0-30q-28-25-15 4M0 38q28-28 13-28"
                fill="#81b89a"
                stroke="#69a383"
                strokeWidth="2"
              />
              {[0, 60, 120, 180, 240, 300].map((r) => (
                <ellipse
                  key={r}
                  cy="-10"
                  rx="5"
                  ry="12"
                  fill="white"
                  transform={`rotate(${r})`}
                />
              ))}
              <circle r="5" fill="#eac773" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
