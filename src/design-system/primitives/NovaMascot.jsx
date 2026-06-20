import novaIdle from "../../assets/icons/nova/idle.svg";
import novaCorrect from "../../assets/icons/nova/correct.svg";
import novaWrong from "../../assets/icons/nova/wrong.svg";

const STATE_ICONS = { idle: novaIdle, correct: novaCorrect, wrong: novaWrong };
const STATE_ANIMATIONS = {
  idle: "nova-float 3s ease-in-out infinite",
  correct: "nova-bounce 0.6s ease",
  wrong: "nova-shake 0.4s ease",
};

// Illustrated Nova, swapped by the same novaState ('idle'|'correct'|'wrong')
// that already drove the emoji + CSS animation — the state and the
// animations are unchanged, only the visual asset is new.
export default function NovaMascot({ novaState = "idle", size = 40, style }) {
  return (
    <img
      src={STATE_ICONS[novaState] ?? novaIdle}
      alt="Nova"
      style={{
        width: size,
        height: size,
        animation: STATE_ANIMATIONS[novaState] ?? STATE_ANIMATIONS.idle,
        ...style,
      }}
    />
  );
}
