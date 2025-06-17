// ✅ विथड्रॉ रुट्स
router.post('/withdraw', auth, routecontroller.withdrawMoney);
router.post('/withdraw/cancel/:id', auth, routecontroller.cancelWithdraw); 