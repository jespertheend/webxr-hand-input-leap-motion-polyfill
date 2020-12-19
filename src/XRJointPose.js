import PfXRPose from "./XRPose.js";

export default class XRJointPose extends PfXRPose{
	constructor(initData){
		super(initData);
		this.radius = 0.005;
	}
}
