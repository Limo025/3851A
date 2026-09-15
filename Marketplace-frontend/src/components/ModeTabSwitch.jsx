import React from 'react'
import { useChatStore } from '../store/useChatStore'
function ModeTabSwitch() {
  const {currentMode, toggleMode} = useChatStore()
  return (
    <div className="tabs tabs-box bg-transparent p-2 m-2 w-11/12 mx-aut flex">
      <button
        onClick={() => toggleMode("buyer")}
        className={`tab flex-1 ${currentMode === "buyer" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"}`}
      >Buyer</button>
      <button
        onClick={() => toggleMode("seller")}
        className={`tab flex-1 ${currentMode === "seller" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"}`}
      >Seller</button>
    </div>
  )
}

export default ModeTabSwitch