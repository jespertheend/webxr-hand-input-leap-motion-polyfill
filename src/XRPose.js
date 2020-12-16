export default class XRPose{
	constructor(emulatedPosition = false){
		this.transform = new XRRigidTransform();
		this.emulatedPosition = emulatedPosition;
	}
}
