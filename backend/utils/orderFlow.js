const FLOW = ['Pending', 'Confirmed', 'Processing', 'Ready for Collection/Delivery', 'Completed'];
const SALES_ALLOWED = ['Confirmed', 'Processing', 'Ready for Collection/Delivery', 'Cancelled'];
function canMove(from, to) {
  if (!FLOW.includes(from) || from === 'Completed') return false;
  if (to === 'Cancelled') return true;
  return FLOW.indexOf(to) === FLOW.indexOf(from) + 1;
}
module.exports = { FLOW, SALES_ALLOWED, canMove };
