import PfXRSpace from "./XRSpace.js";
import PfXRHand from "./XRHand.js";

export default class XRInputSource{
	constructor(){
		this.hand = new PfXRHand();
		this.targetRaySpace = new PfXRSpace();
	}
}
