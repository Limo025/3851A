import React from 'react'
import { useChatStore } from '../store/useChatStore'
function ModeTabSwitch() {
  const {currentMode, toggleMode} = useChatStore()
  return (
    <div className="tabs tabs-box bg-transparent p-2 m-2 w-11/12 mx-aut flex">
      <button
        onClick={() => toggleMode("buyer")}
        className={`tab flex-1 rounded-md ${currentMode === "buyer" ? "bg-white/25 text-white" : "text-blue-100 hover:bg-white/15 hover:text-white"}`}
      >Buyer</button>
      <button
        onClick={() => toggleMode("seller")}
        className={`tab flex-1 rounded-md ${currentMode === "seller" ? "bg-white/25 text-white" : "text-blue-100 hover:bg-white/15 hover:text-white"}`}
      >Seller</button>
    </div>
  )
}

export default ModeTabSwitch
