import { useChatStore } from '../store/useChatStore'
function ModeTabSwitch() {
  const {currentMode, toggleMode, unreadConversationRoles} = useChatStore()
  const unreadRoles = Object.values(unreadConversationRoles)
  const hasUnreadBuyer = unreadRoles.includes('buyer')
  const hasUnreadSeller = unreadRoles.includes('seller')
  return (
    <div className="tabs tabs-box bg-transparent p-2 m-2 w-11/12 mx-aut flex">
      <button
        onClick={() => toggleMode("buyer")}
        className={`tab flex-1 rounded-md ${currentMode === "buyer" ? "bg-white/25 text-white" : "text-blue-100 hover:bg-white/15 hover:text-white"}`}
        aria-label={hasUnreadBuyer ? 'Buyer, unread messages' : 'Buyer'}
      >Buyer{hasUnreadBuyer && <span className="ml-2 inline-block size-2.5 rounded-full border border-white bg-red-500" aria-hidden="true" />}</button>
      <button
        onClick={() => toggleMode("seller")}
        className={`tab flex-1 rounded-md ${currentMode === "seller" ? "bg-white/25 text-white" : "text-blue-100 hover:bg-white/15 hover:text-white"}`}
        aria-label={hasUnreadSeller ? 'Seller, unread messages' : 'Seller'}
      >Seller{hasUnreadSeller && <span className="ml-2 inline-block size-2.5 rounded-full border border-white bg-red-500" aria-hidden="true" />}</button>
    </div>
  )
}

export default ModeTabSwitch
