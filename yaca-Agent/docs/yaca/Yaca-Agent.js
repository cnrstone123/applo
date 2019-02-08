// class SimulationOptions
// Options for n-body simulation and rendering

// class NNode
// Defines a single node for n-body simulation and rendering

// class NLink
// Defines a link between two nodes for n-body simulation and rendering

// class BarnesHutAlgorithmOctTre
// Implementation of OctTree for simulation

// class BarnesHutAlgorithmOctNode
// Implementation of Barnes-Hut algorithm for a three-dimensional simulation
// of charge and gravity

// class NBodySimulator
// Implementation of n-body simulator makes the Branes-Hut simulation and
// adds the link forces

// class HttpRequestUtils
// Simple Helper to send HTTP requests

// class ColorPalette
// Simple Helper to create color codes. The colors are cached to improve
// performance.

//  class YacaMonitor
//  Main class to render YACA Monitor

///////////////////////////////////////////////////////////////////////////
// class SimulationOptions
// Options for n-body simulation and rendering
///////////////////////////////////////////////////////////////////////////

class SimulationOptions {

	constructor() {
		// General Options
		this.RUN_IMPORT = true;
		this.RUN_IMPORT_INTERVAL = 2000;
		this.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST = '';
		this.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST = '';
		this.ACTIVE_PID = "----";

		// Show Nodes by
		this.FILTER_ALL_CALL_DEEP_CALLED = 0;
		this.FILTER_ALL_CALL_DEEP_CALLER = 0;

		// Filter Activity
		this.RENDER_LIMIT_NODE_NUMBER = 40.0;
		this.RENDER_THRESHOLD = 60.0;
		this.RENDER_INACTIVE = false;

		// Extended Options
		this.MODEL_VIEW_FILTER = '';
		this.MODEL_VIEW_FILTER_INVERT = false;

		// Extended Options
		this.DISPLAY_DIRECTIONS = true;
		this.DISPLAY_NAMES = true;

		// N-Body Simulation
		this.RUN_SIMULATION = true;
		this.DISTANCE = 110;
		this.SPRING = 60;
		this.CHARGE = 200;
		this.GRAVITY = 800;
		this.FORCE_2D = false;

		// Others ...
		this.SPHERE_RADIUS_MINIMUM = 20;
		this.SPHERE_RADIUS = 1200;
		this.THETA = 0.8;
	}
}


///////////////////////////////////////////////////////////////////////////
// class NNode
// Defines a single node for n-body simulation and rendering
///////////////////////////////////////////////////////////////////////////

class NNode {

	constructor(node) {
		this.id = node.id;
		this.isClusterNode = node.isClusterNode;
		this.name = node.name;
		this.alias = node.alias;
		this.calls = node.calls;
		this.clusterId = node.clusterId;
		this.isFiltered = YACA_NodeRegexFilter.test(node.name);
		this.x = node.x;
		this.y = node.y;
		this.z = node.z;
		this.selected = false;
		this.force_x = 0.0;
		this.force_y = 0.0;
		this.force_z = 0.0;
		this.sphere = {};
		this.sphereCreated = false;
		this.text = {};
		this.textCreated = false;
		this.callers = [];
		this.callees = [];
		this.callerCalleeAnalysisDone = false;
		this.callerCallerAnalysisDone = false;
		this.isIndirectVisible = false;
		this.isHiddenMaxNumber = false;
	}

	addCaller(node) {
		if (this.callers.indexOf(node) === -1) {
			this.callers.push(node);
		}
	}

	addCallee(node) {
		if (this.callees.indexOf(node) === -1) {
			this.callees.push(node);
		}
	}

	setCalleesVisible(nodeList, callDeep) {
		if (!this.callerCalleeAnalysisDone) {
			this.callerCalleeAnalysisDone = true;
			for (var i = 0; i < this.callees.length; i++) {
				var nextNode = this.callees[i];
				if (callDeep < YACA_Options.FILTER_ALL_CALL_DEEP_CALLED) {
					if (nodeList.indexOf(nextNode) === -1) {
						nodeList.push(nextNode);
						nextNode.isIndirectVisible = true;
					}
					nextNode.setCalleesVisible(nodeList, callDeep + 1);
				}
			}
		}
	}

	setCallersVisible(nodeList, callDeep) {
		if (!this.callerCallerAnalysisDone) {
			this.callerCallerAnalysisDone = true;
			for (var i = 0; i < this.callers.length; i++) {
				var nextNode = this.callers[i];
				if (nodeList.indexOf(nextNode) === -1) {
					if (callDeep < YACA_Options.FILTER_ALL_CALL_DEEP_CALLER) {
						nodeList.push(nextNode);
						nextNode.isIndirectVisible = true;
					}
					nextNode.setCallersVisible(nodeList, callDeep + 1);
				}
			}
		}
	}

	update(node) {
		this.callFilter();
		this.calls = this.isFiltered ? node.calls : 0;
	}

	callFilter() {
		this.isFiltered = YACA_NodeRegexFilter.test(this.name);
	}

	getCalls() {
		return this.calls;
	}

	isVisible() {
		return !this.isClusterNode
			&& !this.isHiddenMaxNumber
			&& (this.isIndirectVisible || (this.getActivity() >= YACA_Options.RENDER_THRESHOLD) && this.isFiltered);
	}

	getActivity() {
		return (this.getCalls() <= 0) ? 0.0 : 100.0 * (Math.log(this.getCalls()) / Math
			.log(YACA_NBodySimulator.maxNodeCalls));
	}

	initRandomPosition() {
		var gamma = 2 * Math.PI * Math.random();
		var delta = Math.PI * Math.random();
		var radius = YACA_Options.SPHERE_RADIUS * 0.95;
		this.x = radius * Math.sin(delta) * Math.cos(gamma);
		this.y = radius * Math.sin(delta) * Math.sin(gamma);
		this.z = radius * Math.cos(delta);
	}
}


///////////////////////////////////////////////////////////////////////////
// class NLink
// Defines a link between two nodes for n-body simulation and rendering
///////////////////////////////////////////////////////////////////////////

class NLink {

	constructor(link, me) {

		// Simulation of spring forces between nodes
		this.id = link.id;
		this.source = me.node_list[link.sourceId];
		this.target = me.node_list[link.targetId];

		// Rendering elements
		this.threeElement = {};
		this.linkWebGLCreated = false;
		this.arrow = {};
		this.arrowCreated = false;
		this.source.addCallee(this.target);
		this.target.addCaller(this.source);
	}

	isVisible() {
		return this.source.isVisible() && this.target.isVisible();
	}

}


///////////////////////////////////////////////////////////////////////////
// class BarnesHutAlgorithmOctTre
// Implementation of OctTree for simulation
///////////////////////////////////////////////////////////////////////////

class BarnesHutAlgorithmOctTree {

	constructor(options) {
		// Parameter needed for the simulation
		if (typeof(options) !== "undefined") {
			if (typeof(options.SPHERE_RADIUS) !== "undefined") {
				YACA_Options.SPHERE_RADIUS = options.SPHERE_RADIUS;
			}
			if (typeof(options.SPHERE_RADIUS_MINIMUM) !== "undefined") {
				YACA_Options.SPHERE_RADIUS_MINIMUM = options.SPHERE_RADIUS_MINIMUM;
			}
			if (typeof(options.CHARGE) !== "undefined") {
				YACA_Options.CHARGE = options.CHARGE;
			}
			if (typeof(options.THETA) !== "undefined") {
				YACA_Options.THETA = options.THETA;
			}
			if (typeof(options.GRAVITY) !== "undefined") {
				YACA_Options.GRAVITY = options.GRAVITY;
			}
		}
	}

	calcGravityForce(node) {
		var deltaX = node.x;
		var deltaY = node.y;
		var deltaZ = node.z;
		var radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
		if (radius > YACA_Options.SPHERE_RADIUS_MINIMUM * 10) {
			node.force_x -= (deltaX) / radius / radius * YACA_Options.GRAVITY;
			node.force_y -= (deltaY) / radius / radius * YACA_Options.GRAVITY;
			node.force_z -= (deltaZ) / radius / radius * YACA_Options.GRAVITY;
		}
	}

	run(nodes) {
		var size = YACA_Options.SPHERE_RADIUS;
		YACA_OctTreeRoot = new BarnesHutAlgorithmOctNode(-size, size, -size, size, -size, size);
		var node;
		if (nodes.length > 1) {
			for (var i = 0; i < nodes.length; i++) {
				node = nodes[i];
				YACA_OctTreeRoot.addNode(node);
			}
			YACA_OctTreeRoot.calculateAveragesAndSumOfMass();
			for (i = 0; i < nodes.length; i++) {
				node = nodes[i];
				YACA_OctTreeRoot.calculateForces(node);
				this.calcGravityForce(node);
			}
		}
	}
}


///////////////////////////////////////////////////////////////////////////
// class BarnesHutAlgorithmOctNode
// Implementation of Barnes-Hut algorithm for a three-dimensional simulation
// of charge and gravity
///////////////////////////////////////////////////////////////////////////

class BarnesHutAlgorithmOctNode {

	constructor(xMin, xMax, yMin, yMax, zMin, zMax) {
		this.xMin = xMin;
		this.xMax = xMax;
		this.yMin = yMin;
		this.yMax = yMax;
		this.zMin = zMin;
		this.zMax = zMax;
		this.sum_mass = 0;
		this.sum_x = 0;
		this.sum_y = 0;
		this.sum_z = 0;
		this.node = null;
		this.children = null;
		this.diameter = (((xMax - xMin) + (yMax - yMin) + (zMax - zMin)) / 3);
	}

	isFilled() {
		return (this.node !== null);
	}

	isParent() {
		return (this.children !== null);
	}

	isFitting(node) {
		return ((node.x >= this.xMin) && (node.x <= this.xMax) && (node.y >= this.yMin)
			 && (node.y <= this.yMax) && (node.z >= this.zMin) && (node.z <= this.zMax));
	}

	addNode(new_node) {
		if (this.isFilled() || this.isParent()) {
			var relocated_node;
			if (YACA_Options.SPHERE_RADIUS_MINIMUM > this.diameter) {
				var radius = Math.sqrt(new_node.x * new_node.x + new_node.y * new_node.y + new_node.z * new_node.z);
				var factor = (radius - YACA_Options.SPHERE_RADIUS_MINIMUM) / radius;
				new_node.x *= factor;
				new_node.y *= factor;
				new_node.z *= factor;
				relocated_node = this.node;
				this.node = null;
				this.sum_mass = 0;
				this.sum_x = 0;
				this.sum_y = 0;
				this.sum_z = 0;
				YACA_OctTreeRoot.addNode(relocated_node);
				return;
			}
			if (!this.isParent()) {
				var xMiddle = (this.xMin + this.xMax) / 2;
				var yMiddle = (this.yMin + this.yMax) / 2;
				var zMiddle = (this.zMin + this.zMax) / 2;

				// create children
				this.children = [];
				this.children.push(new BarnesHutAlgorithmOctNode(xMiddle, this.xMax, yMiddle, this.yMax, zMiddle, this.zMax));
				this.children.push(new BarnesHutAlgorithmOctNode(this.xMin, xMiddle, yMiddle, this.yMax, zMiddle, this.zMax));
				this.children.push(new BarnesHutAlgorithmOctNode(this.xMin, xMiddle, this.yMin, yMiddle, zMiddle, this.zMax));
				this.children.push(new BarnesHutAlgorithmOctNode(xMiddle, this.xMax, this.yMin, yMiddle, zMiddle, this.zMax));
				this.children.push(new BarnesHutAlgorithmOctNode(xMiddle, this.xMax, yMiddle, this.yMax, this.zMin, zMiddle));
				this.children.push(new BarnesHutAlgorithmOctNode(this.xMin, xMiddle, yMiddle, this.yMax, this.zMin, zMiddle));
				this.children.push(new BarnesHutAlgorithmOctNode(this.xMin, xMiddle, this.yMin, yMiddle, this.zMin, zMiddle));
				this.children.push(new BarnesHutAlgorithmOctNode(xMiddle, this.xMax,this.yMin, yMiddle, this.zMin, zMiddle));

				// re-locate old node (add into children)
				relocated_node = this.node;
				this.node = null;
				this.sum_mass = 0;
				this.sum_x = 0;
				this.sum_y = 0;
				this.sum_z = 0;
				this.addChildNode(relocated_node);
			}

			// now add new node into children
			if (this.isParent()) {
				this.addChildNode(new_node);
			}
		} else {
			this.node = new_node;
			this.sum_mass = 1;
			this.sum_x = this.node.x;
			this.sum_y = this.node.y;
			this.sum_z = this.node.z;
			this.node.force_x = 0.0;
			this.node.force_y = 0.0;
			this.node.force_z = 0.0;
		}
	}

	addChildNode(node) {
		if (this.isParent()) {
			for (var index = 0; index < 8; index++) {
				var child = this.children[index];
				if (child.isFitting(node)) {
					child.addNode(node);
					return;
				}
			}
		}

		// Unable to add node -> has to be relocated
		YACA_OctTreeRoot.addNode(node);
	}

	calculateForces(new_node) {
		if (this.sum_mass > 0.1 || this.isFilled()) {
			var deltaX, deltaY, deltaZ;
			if (this.isFilled()) {
				deltaX = (this.node.x - new_node.x);
				deltaY = (this.node.y - new_node.y);
				deltaZ = (this.node.z - new_node.z);
			} else {
				deltaX = (this.sum_x / this.sum_mass - new_node.x);
				deltaY = (this.sum_y / this.sum_mass - new_node.y);
				deltaZ = (this.sum_z / this.sum_mass - new_node.z);
			}
			var radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
			var radius_squared = Math.pow((radius > 1e-6) ? radius : 1e-6, 2);
			var treatInternalNodeAsSingleBody = this.diameter / radius < YACA_Options.THETA;
			if (this.isFilled() || treatInternalNodeAsSingleBody) {
				new_node.force_x -= (deltaX * YACA_Options.CHARGE) / radius_squared;
				new_node.force_y -= (deltaY * YACA_Options.CHARGE) / radius_squared;
				new_node.force_z -= (deltaZ * YACA_Options.CHARGE) / radius_squared;
			} else if (this.isParent()) {
				for (var index = 0; index < 8; index++) {
					var child = this.children[index];
					if (child.isFilled() || this.isParent()) {
						child.calculateForces(new_node);
					}
				}
			}
		}
	}

	calculateAveragesAndSumOfMass() {
		if (this.isParent()) {
			var child;
			for (var index = 0; index < 8; index++) {
				child = this.children[index];
				child.calculateAveragesAndSumOfMass();
			}
			this.sum_mass = 0;
			this.sum_x = 0;
			this.sum_y = 0;
			this.sum_z = 0;
			for (index = 0; index < 8; index++) {
				child = this.children[index];
				if (child.isFilled() || this.isParent()) {
					this.sum_mass += child.sum_mass;
					this.sum_x += child.sum_x;
					this.sum_y += child.sum_y;
					this.sum_z += child.sum_z;
				}
			}
		}
	}
}


///////////////////////////////////////////////////////////////////////////
// class NBodySimulator
// Implementation of n-body simulator makes the Branes-Hut simulation and
// adds the link forces
///////////////////////////////////////////////////////////////////////////

class NBodySimulator {

	constructor() {
		// all existing nodes and links
		this.node_list = [];
		this.link_list = [];
		this.octTree = new BarnesHutAlgorithmOctTree();
		// all nodes and links that are in the current filter
		this.node_list_visible = [];
		this.link_list_visible = [];
		this.node_list_visible_indirect = [];
		this.node_list_visible_last = [];
		this.link_list_visible_last = [];
		this.maxNodeCalls = 0;
	}

	updateModel(input_model) {
		// create or update nodes
		this.maxNodeCalls = 0;
		var nodes = input_model.nodes;
		for (var i = 0; i < nodes.length; i++) {
			var newNode = nodes[i];
			var node;
			if (this.node_list.length <= newNode.id) {
				node = new NNode(newNode);
				node.initRandomPosition();
				this.node_list.push(node);
			} else {
				node = this.node_list[newNode.id];
				node.update(newNode);
			}
			this.maxNodeCalls = Math.max(this.maxNodeCalls, node.getCalls());
		}
		// create or update links and related nodes
		var links = input_model.links;
		for (i = 0; i < links.length; i++) {
			var newLink = links[i];
			var link;
			if (this.link_list.length <= newLink.id) {
				link = new NLink(newLink, this);
				this.link_list.push(link);
			} else {
				link = this.link_list[newLink.id];
			}
		}
	}

	applyFilter() {
		this.node_list_visible_last = this.node_list_visible;
		this.link_list_visible_last = this.link_list_visible;
		this.node_list_visible = [];
		this.node_list_visible_indirect = [];
		var nodes = this.node_list;

		// Rest all setting
		var node;
		for (var i = 0; i < nodes.length; i++) {
			nodes[i].isHiddenMaxNumber = false;
			node = nodes[i];
			node.isIndirectVisible = false;
			node.isHiddenMaxNumber = false;
			node.callerCalleeAnalysisDone = false;
			node.callerCallerAnalysisDone = false;
		}

		var link;
		var me = this;
		var maxNumber = 0;
		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];
			node.callFilter();
			if (node.isVisible()) {
				if (maxNumber < YACA_Options.RENDER_LIMIT_NODE_NUMBER) {
					me.node_list_visible.push(node);
					maxNumber += 1;
				} else {
					node.isHiddenMaxNumber = true;
				}
			}
		}

		for (i = 0; i < this.node_list.length; i++) {
			node = this.node_list[i];
			if (node.isVisible() && !node.isIndirectVisible) {
				if (YACA_Options.FILTER_ALL_CALL_DEEP_CALLER > 0) {
					node.setCallersVisible(me.node_list_visible_indirect, 0);
				}
				if (YACA_Options.FILTER_ALL_CALL_DEEP_CALLED > 0) {
					node.setCalleesVisible(me.node_list_visible_indirect, 0);
				}
			}
		}
		for (i = 0; i < this.node_list_visible_indirect.length; i++) {
			var node = this.node_list_visible_indirect[i];
			if (this.node_list_visible.indexOf(node) === -1) {
				if (node.isVisible()) {
					if (maxNumber < YACA_Options.RENDER_LIMIT_NODE_NUMBER) {
						me.node_list_visible.push(node);
						maxNumber += 1;
					} else {
						node.isHiddenMaxNumber = true;
					}
				}
			}
		}

		// Select all
		this.link_list_visible = [];
		var links = this.link_list;
		for (i = 0; i < links.length; i++) {
			link = links[i];
		}
		for (i = 0; i < links.length; i++) {
			link = links[i];
			if (link.isVisible()) {
				me.link_list_visible.push(link);
			}
		}
	}

	simulateAllForces() {
		// Execute Barnes-Hut simulation
		this.octTree = new BarnesHutAlgorithmOctTree();
		this.octTree.run(this.node_list_visible);
		// Calculate link forces
		var me = this;
		this.link_list_visible.forEach(function(link) {
			if (link.source.id !== link.target.id) {
				me.calcLinkForce(link);
			}
		});
		// Scale and apply all forces
		this.node_list_visible.forEach(function(node) {
			me.scaleForceToBeSmall(node);
			me.applyForces(node);
			me.scaleToBeInSphere(node);
			me.resetForces(node);
		});
	}

	/**
	 * Each link acts as simple spring. There are two types of nodes and links.
	 */
	calcLinkForce(link) {
		var deltaX = (link.source.x - link.target.x);
		var deltaY = (link.source.y - link.target.y);
		var deltaZ = (link.source.z - link.target.z);
		var radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
		if (radius > 1e-6) {
			var factor = (radius - YACA_Options.DISTANCE) / radius / radius * YACA_Options.SPRING;
			link.source.force_x -= (deltaX) * factor;
			link.source.force_y -= (deltaY) * factor;
			link.source.force_z -= (deltaZ) * factor;
			link.target.force_x += (deltaX) * factor;
			link.target.force_y += (deltaY) * factor;
			link.target.force_z += (deltaZ) * factor;
		}
	}

	/**
	 * Ensure that the new position is in the sphere. Nodes which leave the sphere
	 * would be ignored by OctTree (Barnes-Hut-Algorithm).
	 */
	scaleToBeInSphere(node) {
		node.x = Math.min(Math.max(1 - YACA_Options.SPHERE_RADIUS, node.x),
			YACA_Options.SPHERE_RADIUS - 1);
		node.y = Math.min(Math.max(1 - YACA_Options.SPHERE_RADIUS, node.y),
			YACA_Options.SPHERE_RADIUS - 1);
		node.z = (YACA_Options.FORCE_2D) ? Math.random() * 0.1 : Math.min(Math.max(
				1 - YACA_Options.SPHERE_RADIUS, node.z),
			YACA_Options.SPHERE_RADIUS - 1);
	}

	/**
	 * Ensure that the new position is in the sphere
	 */
	scaleForceToBeSmall(node) {
		var radius = Math.sqrt(node.force_x * node.force_x + node.force_y * node.force_y + node.force_z * node.force_z);
		if (radius > YACA_Options.SPHERE_RADIUS_MINIMUM) {
			node.force_x *= YACA_Options.SPHERE_RADIUS_MINIMUM / radius;
			node.force_y *= YACA_Options.SPHERE_RADIUS_MINIMUM / radius;
			node.force_z *= YACA_Options.SPHERE_RADIUS_MINIMUM / radius;
		}
	}

	/**
	 * Move the nodes depending of the forces
	 */
	applyForces(node) {
		node.x += node.force_x;
		node.y += node.force_y;
		node.z += node.force_z;
	}

	/**
	 * Reset all forces of the node to zero
	 */
	resetForces(node) {
		node.force_x = 0;
		node.force_y = 0;
		node.force_z = 0;
	}
}

/**
 * global variables for N-Body-Simulation
 */
var YACA_Options = new SimulationOptions();
var YACA_NodeRegexFilter = new RegExp(YACA_Options.MODEL_VIEW_FILTER);
var YACA_OctTreeRoot = {};
var YACA_NBodySimulator = new NBodySimulator();

///////////////////////////////////////////////////////////////////////////
// class HttpRequestUtils
// Simple Helper to send HTTP requests
///////////////////////////////////////////////////////////////////////////

class HttpRequestUtils {

	callDELETE(url) {
		var xmlHttp = null;
		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("DELETE", url);
		xmlHttp.setRequestHeader("Cache-Control", "no-cache");
		xmlHttp.send(null);
	}

	callPUT(url, value) {
		var xmlHttp = null;
		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("PUT", url);
		xmlHttp.setRequestHeader("Cache-Control", "no-cache");
		xmlHttp.setRequestHeader("Content-type", "text/plain");
		xmlHttp.send(value);
	}

	callGET(url, callback) {
		var xmlHttp = null;
		xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", url, true);
		xmlHttp.setRequestHeader("Cache-Control", "no-cache");
		xmlHttp.setRequestHeader('Content-type', 'text/plain');
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
				callback(xmlHttp.responseText);
			}
		};
		xmlHttp.send("");
	}
}


///////////////////////////////////////////////////////////////////////////
// class ColorPalette
// Simple Helper to create color codes. The colors are cached to improve
// performance.
///////////////////////////////////////////////////////////////////////////

class ColorPalette {

	constructor() {
		this.hash = new Map();
	}

	getColorHex(value) {

		// Converts a integer to a two char hex code
		var integerToHex = function(value) {
			value = Math.max(0, Math.min(parseInt(value, 10), 255));
			var charFirst = "0123456789ABCDEF".charAt((value - value % 16) / 16);
			var charSecond = "0123456789ABCDEF".charAt(value % 16);
			return charFirst + charSecond;
		};

		// Caches caculated colors
		var key = value.toString();
		if (null == this.hash.get(key)) {
			var frequency = value * 0.5;
			var red = Math.sin(frequency) * 127 + 127;
			var green = Math.sin(2 + frequency) * 127 + 127;
			var blue = Math.sin(4 + frequency) * 127 + 127;
			this.hash.set(key, '' + integerToHex(red) + integerToHex(green) + integerToHex(blue));
		}
		return this.hash.get(key);
	}

	getColorCodeAsInteger(value) {
		return parseInt(this.getColorHex(value), 16);
	}

	getColorCodeAsHexString(value) {
		return '0x' + this.getColorHex(value);
	}

}


///////////////////////////////////////////////////////////////////////////
//  class YacaMonitor
//  Main class to render YACA Monitor
///////////////////////////////////////////////////////////////////////////

class YacaMonitor {

	constructor() {
		this.scene;
		this.camera;
		this.renderer;
		this.control;
		this.objects = [];
		this.light;
		this.container;
		this.projector;
		this.http = new HttpRequestUtils();
		this.palette = new ColorPalette();
		this.lastUpdate = new Date();
		this.currentWhiteListFilter = "";
		this.currentBlackListFilter = "";
		this.modelText;
		this.url = this.getAnalyserServiceURL();
		this.activeNode = null;
		this.gui_pid;
		this.gui_folder1 = null;
		this.font;
	}

	/**
	 * Yaca analyser URL changes depending on deploy target, so it will be calculated
	 */
	getAnalyserServiceURL() {
		var host = window.location.host;
		var scheme_domain_port_length = window.location.href.indexOf(host) + host.length;
		var scheme_domain_port = window.location.href.substring(0, scheme_domain_port_length);
		return scheme_domain_port;
	}

	init() {
		if (!Detector.webgl) {
			document.body.appendChild(Detector.getWebGLErrorMessage());
			return false;
		} else {
			this.initWebGL();
		}
		return true;
	}

	initWebGL() {

		// Create the renderer
		this.renderer = new THREE.WebGLRenderer({
			antialias: true
		});
		this.renderer.setClearColor(0x222222, 1);

		// Container for WebGL rendering
		this.container = $id('graphic-container');

		// Create Camera
		this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 40000);

		// Create this.scene
		this.scene = new THREE.Scene();
		this.scene.add(this.camera);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.container.appendChild(this.renderer.domElement);

		// Event handler
		this.projector = new THREE.Projector();

		// Create light
		this.light = new THREE.SpotLight(0xffffff, 1.25);
		this.light.castShadow = true;
		this.scene.add(this.light);

		// Create light near the center
		var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.7);
		hemiLight.groundColor.setHSL(0.095, 1, 0.75);
		hemiLight.position.set(0, 200, 0);
		this.scene.add(hemiLight);
		this.scene.fog = new THREE.FogExp2(0xffffff, 0.00005);

		resizeCallback();
		window.addEventListener('resize', resizeCallback, false);
		this.control = new THREE.TrackballControls(this.camera, this.renderer.domElement);
		this.control.target.set(0, 0, 0);
		this.control.rotateSpeed = 1.0;
		this.control.zoomSpeed = 1.2;
		this.control.panSpeed = 0.8;
		this.control.staticMoving = false;
		this.control.dynamicDampingFactor = 0.15;
		this.control.addEventListener('change', rendererEventHandler);
		this.control.noRotate = false;
		this.updateLightPosition();

		// create Dat.GUI for standard rendering
		this.googleDatGui = new dat.GUI({
			autoPlace: false,
			width: 330
		});
		this.createGui(this.googleDatGui);
		this.container.appendChild(this.googleDatGui.domElement);
		this.googleDatGui.domElement.style.position = 'absolute';
		this.googleDatGui.domElement.style.right = '10px';
		this.googleDatGui.domElement.style.top = '10px';

		// Don't use stats in release version
		this.createStats();

		var _that = this;
		var loader = new THREE.FontLoader();
		loader.load('monitor/external/helvetiker_regular.typeface.js', function(response) {
			_that.font = response;
		});
	}

	createStats() {
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.bottom = '' + 10 + 'px';
		this.stats.domElement.style.right = '' + 10 + 'px';
		this.stats.domElement.style.zIndex = 100;
		this.container.appendChild(this.stats.domElement);
	}

	/**
	 * Move light dependent on the position of the camera. The rotation of the
	 * graphic is done by movement of the camera and not the rotation of the scene
	 */
	updateLightPosition() {
		this.light.position.x = this.control.object.position.x - 500;
		this.light.position.y = this.control.object.position.y + 1500;
		this.light.position.z = this.control.object.position.z + 1500;
		this.light.target.position.set(0, 0, 0);
	}

	/**
	 * Creates and/or updates THRRE.js elements of the webGL graphic. Because the
	 * creation of THREE.js elements is relative slow, most of the elements are
	 * moved and rotated as needed. Invisible elements will just be hidden and not
	 * deleted.
	 */
	updateWebGL(nodes, links) {
		for (var i = 0; i < nodes.length; i++) {
			this.renderNodeSphere(nodes[i]);
			this.renderNodeLabel(nodes[i]);
		}
		for (i = 0; i < links.length; i++) {
			this.renderArrowElementForLink(links[i]);
		}
	}

	/**
	 * Delete THRRE.js elements of the webGL graphic.
	 */
	deleteWebGL(nodes, links) {
		for (var i = 0; i < nodes.length; i++) {
			if (nodes[i].sphereCreated) {
				this.scene.remove(nodes[i].sphere);
				this.scene.remove(nodes[i].text);
			}
		}
		for (i = 0; i < links.length; i++) {
			if (links[i].linkWebGLCreated) {
				this.scene.remove(links[i].arrow);
				this.scene.remove(links[i].threeElement);
			}
		}
	}

	/**
	 * Renders sphere for the node
	 */
	renderNodeSphere(node) {
		if (node.sphereCreated) {
			node.sphere.position.x = node.x;
			node.sphere.position.z = node.z;
			node.sphere.position.y = node.y;
			node.sphere.visible = node.isVisible();
			var scaleFactor = (node === this.activeNode) ? 1.5 : 1.0
			node.sphere.scale.set(scaleFactor, scaleFactor, scaleFactor) ;
			if (node.sphere.visible) {
				this.objects.push(node.sphere);
			} else {
				this.objects.pop(node.sphere);
			}
		} else {
			var material = new THREE.MeshLambertMaterial({
				reflectivity: 0.9,
				depthTest: true,
				transparent: false
			});
			var a = YACA_Options.SPHERE_RADIUS_MINIMUM;
			node.sphere = new THREE.Mesh(new THREE.BoxGeometry(a, a, a), material);
			var color = this.palette.getColorCodeAsHexString(node.clusterId);
			node.sphere.material.color.setHex(color);
			node.sphere.position.x = node.x;
			node.sphere.position.z = node.z;
			node.sphere.position.y = node.y;
			node.sphere.visible = false;
			node.forceTextVisible = false;
			this.scene.add(node.sphere);
			node.sphereCreated = true;
			node.sphere.nnode = node;
		}
	}

	/**
	 * Renders the alias of the node
	 */
	renderNodeLabel(node) {
		if (node.textCreated) {
			node.text.visible = node.isVisible() && (node === this.activeNode || YACA_Options.DISPLAY_NAMES);
			if (node.text.visible) {
				node.text.position.x = node.x + YACA_Options.SPHERE_RADIUS_MINIMUM * 0.8;
				node.text.position.y = node.y + YACA_Options.SPHERE_RADIUS_MINIMUM * 0.8;
				node.text.position.z = node.z + YACA_Options.SPHERE_RADIUS_MINIMUM * 0.8;
				node.text.rotation.x = this.camera.rotation._x;
				node.text.rotation.y = this.camera.rotation._y;
				node.text.rotation.z = this.camera.rotation._z;
				var scaleFactor = (node === this.activeNode) ? 1.5 : 1.0
				node.text.scale.set(scaleFactor, scaleFactor, scaleFactor);
			}
		} else if (YACA_Options.DISPLAY_NAMES || node === this.activeNode) {

			var geometry = new THREE.TextGeometry(node.alias, {
				font: this.font,
				size: 14,
				height: 1
			});
			var material = new THREE.MeshPhongMaterial({
				color: this.palette.getColorCodeAsInteger(node.clusterId),
			});
			node.text = new THREE.Mesh(geometry, material);
			node.textCreated = true;
			this.scene.add(node.text);
		}
	}

	/**
	 * Renders a link - optional with arrow head
	 */
	renderArrowElementForLink(link) {

		// Truncate the end points of a line
		var moveEndPoints = function(source_position, source_delta, target_position, target_delta) {
			var deltaX = (source_position.x - target_position.x);
			var deltaY = (source_position.y - target_position.y);
			var deltaZ = (source_position.z - target_position.z);
			var radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
			source_position.x -= (deltaX) / radius * (source_delta);
			source_position.y -= (deltaY) / radius * (source_delta);
			source_position.z -= (deltaZ) / radius * (source_delta);
			target_position.x += (deltaX) / radius * (target_delta);
			target_position.y += (deltaY) / radius * (target_delta);
			target_position.z += (deltaZ) / radius * (target_delta);
		};

		// Center position of the nodes
		var source_position = new THREE.Vector3(link.source.x, link.source.y, link.source.z);
		var target_position = new THREE.Vector3(link.target.x, link.target.y, link.target.z);

		// Just for recursive links have no source node
		if (link.source.id === link.target.id) {
			source_position.y += YACA_Options.DISTANCE;
		}
		if (link.linkWebGLCreated) {
			// Truncate the line, so that the arrow ends not in the center of the node
			moveEndPoints(source_position, YACA_Options.SPHERE_RADIUS_MINIMUM, target_position, YACA_Options.SPHERE_RADIUS_MINIMUM);
			// Move existing arrow
			var direction = new THREE.Vector3().subVectors(target_position, source_position);
			link.arrow.visible = link.isVisible();
			link.arrow.position.set(source_position.x, source_position.y, source_position.z);
			link.arrow.setDirection(direction.clone().normalize());
			link.arrow.setLength(direction.length());
		} else {
			// Create new arrow
			var sourcePos = new THREE.Vector3(0, 0, 0);
			var targetPos = new THREE.Vector3(0, 50, 50);
			var direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
			var color = this.palette.getColorCodeAsInteger(link.source.clusterId);
			link.arrow = new THREE.ArrowHelper(direction.clone().normalize(), sourcePos, direction.length(), color);
			link.linkWebGLCreated = true;
			this.scene.add(link.arrow);
		}
	}

	resetAllData() {
		this.deleteWebGL(YACA_NBodySimulator.node_list_visible_last, YACA_NBodySimulator.link_list_visible_last);
		this.deleteWebGL(YACA_NBodySimulator.node_list_visible, YACA_NBodySimulator.link_list_visible);
		YACA_OctTreeRoot = {};
		YACA_NBodySimulator = new NBodySimulator();
	}

	/**
	 * OutcallPUT of status line
	 */
	updateStatusLine(iterations) {
		var msg = '';
		msg = msg.concat('Nodes ').concat(YACA_NBodySimulator.node_list_visible.length);
		msg = msg.concat(' (').concat(YACA_NBodySimulator.node_list.length);
		msg = msg.concat(') and links ').concat(YACA_NBodySimulator.link_list_visible.length);
		msg = msg.concat(' (').concat(YACA_NBodySimulator.link_list.length);
		msg = msg.concat(') ');
		msg = msg.concat(' - process ').concat(YACA_Options.ACTIVE_PID);
		msg = msg.concat(' - ');
		if (YACA_Options.RUN_IMPORT) {
			msg = msg.concat(' last import ').concat(this.lastUpdate.toLocaleTimeString());
		} else {
			msg = msg.concat(' import is not active');
		}

		$id('statusLine').innerHTML = msg;
	}

	/**
	 * User interface to change parameters
	 */
	createGui(gui) {

		this.gui_folder1 = gui.addFolder('Import Options');
		var folder02 = gui.addFolder('Rendering Options');
		var folder03 = gui.addFolder('N-Body Simulation');
		var that = this;
		this.gui_folder1.add(YACA_Options, 'RUN_IMPORT').listen().name('Active').onChange(function(value) {
			if (YACA_Options.RUN_IMPORT) {
				if (0 === YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST.length) {
					that.http.callDELETE(that.url + "/filterWhite");
				} else {
					that.http.callPUT(that.url + "/filterWhite", YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST);
				}
				if (0 === YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST.length) {
					that.http.callDELETE(that.url + "/filterBlack");
				} else {
					that.http.callPUT(that.url + "/filterBlack", YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST);
				}
			}
		});
		this.gui_folder1.add(guiEvents, 'resetModelEvent').listen().name("Reset Model");
    	this.gui_folder1.add(guiEvents, 'downloadModelEvent').listen().name("Download Model");
		this.gui_folder1.add(YACA_Options, 'RUN_IMPORT_INTERVAL', 500, 5000).step(500).listen().name("Intervall").onChange(
			function(value) {
				clearInterval(modelTimer);
				modelTimer = setInterval(function() {
					executeTimerGetYacaAnalyserModel();
				}, YACA_Options.RUN_IMPORT_INTERVAL);
			});
		this.gui_folder1.add(YACA_Options, 'RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST').listen().name('Filter White List').onChange(
			function(value) {
				if (0 === value.length) {
					that.http.callDELETE(that.url + "/filterWhite");
				} else {
					that.http.callPUT(that.url + "/filterWhite", value);
					if (that.currentWhiteListFilter !== value) {
						that.resetAllData();
					}
				}
	    		that.currentWhiteListFilter = value;
			});
		this.gui_folder1.add(YACA_Options, 'RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST').listen().name('Filter Black List').onChange(
			function(value) {
				if (0 === value.length) {
					that.http.callDELETE(that.url + "/filterBlack");
				} else {
					that.http.callPUT(that.url + "/filterBlack", value);
					if (that.currentBlackListFilter !== value) {
						that.resetAllData();
					}
				}
				that.currentBlackListFilter = value;
			});
		this.gui_folder1.add(guiEvents, 'stopAnalyserEvent').listen().name("Stop Analyser");

		// this.gui_folder1.open();

		folder02.add(guiEvents, 'resetRenderingEvent').listen().name("Reset Position");
		folder02.add(YACA_Options, 'FILTER_ALL_CALL_DEEP_CALLED', 0, 20).listen().name('Add Called Nodes').step(1);
		folder02.add(YACA_Options, 'FILTER_ALL_CALL_DEEP_CALLER', 0, 20).listen().name('Add Caller Nodes').step(1);
		folder02.add(YACA_Options, 'RENDER_THRESHOLD', 0.0, 100.0).step(1.0).listen().name('Activity Index');
		folder02.add(YACA_Options, 'RENDER_LIMIT_NODE_NUMBER', 10.0, 100.0).step(10.0).listen().name('Max Nodes');
		folder02.add(YACA_Options, 'MODEL_VIEW_FILTER').name('Filter Display').listen().onChange(function(value) {
			if (0 === value.length) {
				YACA_Options.RENDER_THRESHOLD = 80;
				YACA_Options.FILTER_ALL_CALL_DEEP_CALLED = 0;
				YACA_Options.FILTER_ALL_CALL_DEEP_CALLER = 0;
			}
			YACA_Options.MODEL_VIEW_FILTER = value;
			changeModelViewFilter();
		});
		folder02.add(YACA_Options, 'MODEL_VIEW_FILTER_INVERT').name('Filter Invert').listen().onChange(invertFilterEventHandler);
		folder02.add(YACA_Options, 'DISPLAY_NAMES').name('Show Labels').listen();
		folder02.add(YACA_Options, 'FORCE_2D').listen().name('Force 2D');

		folder03.add(YACA_Options, 'RUN_SIMULATION').listen().name('Run');
		folder03.add(YACA_Options, 'DISTANCE', 40, 200).step(10.0).listen().name('Link Distance');
		folder03.add(YACA_Options, 'SPRING', 0.0, 120).step(10.0).listen().name('Link Spring');
		folder03.add(YACA_Options, 'CHARGE', 10, 400).step(10.0).listen().name('Charge');
		folder03.add(YACA_Options, 'GRAVITY', 10, 1600).step(100.0).listen().name('Gravity');
	}
}


/**
 * Selection handler
 */
function fileSelectHandler(e) {
	fileDragHover(e);
	var files = e.target.files || e.dataTransfer.files;
	for (var i = 0, file; file = files[i]; i++) {
		if (file.name.indexOf(".yaca") > 0) {
			var reader = new FileReader();
			reader.onload = function(e) {
				yacaMonitor.resetAllData();
				modelCallback(e.target.result);
				YACA_Options.RUN_IMPORT = false;
			};
			reader.readAsText(file);
		}
	}
}

/**
 * Element by ID helper
 */
function $id(id) {
	return document.getElementById(id);
}

/**
 * File drag hover
 */
function fileDragHover(e) {
	e.stopPropagation();
	e.preventDefault();
	e.target.className = (e.type == "dragover" ? "hover" : "");
}

/**
 * Initialization
 */
function initFileDragAndDrop() {
	var fileselect = $id("fileselect");
	var filedrag = $id("graphic-container");
	fileselect.addEventListener("change", fileSelectHandler, false);
	var xhr = new XMLHttpRequest();
	if (xhr.upload) {
		filedrag.addEventListener("dragover", fileDragHover, false);
		filedrag.addEventListener("dragleave", fileDragHover, false);
		filedrag.addEventListener("drop", fileSelectHandler, false);
		filedrag.style.display = "block";
	}
}

/**
 * Animate WebGL
 */
var animate = function() {
	yacaMonitor.control.update();
	rendererEventHandler();
	requestAnimationFrame(animate);
	yacaMonitor.stats.update();
};

/**
 * Render WebGL
 */
var rendererEventHandler = function() {
	yacaMonitor.renderer.clear();
	yacaMonitor.renderer.render(yacaMonitor.scene, yacaMonitor.camera);
};

var invertFilterEventHandler = function(value) {
	YACA_Options.MODEL_VIEW_FILTER_INVERT = value;
	changeModelViewFilter();
};

var mouseMoveEventHandler = function(event) {

	// Decode the mouse event and prepare raycaster
	var mouse = {};
	mouse.x = ((event.clientX) / (window.innerWidth - yacaMonitor.renderer.domElement.offsetLeft)) * 2 - 1;
	mouse.y = -((event.clientY - yacaMonitor.renderer.domElement.offsetTop) / (yacaMonitor.renderer.domElement.clientHeight)) * 2 + 1;
	var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
	vector.unproject(yacaMonitor.camera);
	var raycaster = new THREE.Raycaster(yacaMonitor.camera.position, vector.sub(yacaMonitor.camera.position).normalize());

	// Find first object
	var intersects = raycaster.intersectObjects(yacaMonitor.objects);
	if (intersects.length > 0 && intersects[0].object.visible) {
		yacaMonitor.activeNode = intersects[0].object.nnode;
		yacaMonitor.renderer.domElement.style.cursor = "pointer";
	} else {
		yacaMonitor.renderer.domElement.style.cursor = "default";
		yacaMonitor.activeNode = null;
	}
};

var mouseDownEventHandler = function(event) {

	// Stop other event listeners from receiving this event
	event.preventDefault();

	if (event.which == 1) {
		// Decode the mouse event and prepare raycaster
		var mouse = {};
		mouse.x = ((event.clientX) / (window.innerWidth - yacaMonitor.renderer.domElement.offsetLeft)) * 2 - 1;
		mouse.y = -((event.clientY - yacaMonitor.renderer.domElement.offsetTop) / (yacaMonitor.renderer.domElement.clientHeight)) * 2 + 1;
		var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
		vector.unproject(yacaMonitor.camera);
		var raycaster = new THREE.Raycaster(yacaMonitor.camera.position, vector.sub(yacaMonitor.camera.position).normalize());
		// Find first object
		var intersects = raycaster.intersectObjects(yacaMonitor.objects);
		if (intersects.length > 0 && intersects[0].object.visible) {
			var node = intersects[0].object.nnode;
			YACA_Options.MODEL_VIEW_FILTER = node.alias.split("$").join("\\$");
			if (YACA_Options.FILTER_ALL_CALL_DEEP_CALLED < 1) {
				YACA_Options.FILTER_ALL_CALL_DEEP_CALLED = 2;
			}
			if (YACA_Options.FILTER_ALL_CALL_DEEP_CALLER < 1) {
				YACA_Options.FILTER_ALL_CALL_DEEP_CALLER = 2;
			}
			YACA_Options.RENDER_THRESHOLD = 0;
			changeModelViewFilter();
		}
	} else if (event.which == 3) {
		guiEvents.resetRenderingEvent();
	}
};

var guiEvents = {
	downloadModelEvent: function() {
		var isBrowserSafari = function() {
			var ua = navigator.userAgent.toLowerCase();
			return ua.indexOf("safari/") !== -1 && ua.indexOf("chrome/") === -1;
		};
		// Downloard with Safari browser on Windows dosen't work properly
		if (!isBrowserSafari()) {
			var a = $id('downloadId');
			var file_content = yacaMonitor.modelText;
			window.URL = window.URL || window.webkitURL;
			var blob = new Blob([file_content], {
				type: "data/text"
			});
			var url = window.URL.createObjectURL(blob);
			a.href = url;
			a.download = 'model' + '-' + getTimeStampAsString() + '.yaca';
			a.click();
		}
	},
	resetRenderingEvent: function() {
		yacaMonitor.control.reset();
		yacaMonitor.camera.position.x = 0;
		yacaMonitor.camera.position.y = 0;
		yacaMonitor.camera.position.z = YACA_Options.SPHERE_RADIUS * 0.8;
		yacaMonitor.camera.rotation.x = 0;
		yacaMonitor.camera.rotation.y = 0;
		yacaMonitor.camera.rotation.z = 0;
		yacaMonitor.camera.lookAt(new THREE.Vector3(0, 0, 0));
	},
	resetModelEvent: function() {
		yacaMonitor.http.callGET(yacaMonitor.url + "/process/ids", vmCallback);
		yacaMonitor.resetAllData();
		yacaMonitor.http.callPUT(yacaMonitor.url + "/filterWhite", YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST);
		yacaMonitor.http.callPUT(yacaMonitor.url + "/filterBlack", YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST);
		yacaMonitor.http.callDELETE(yacaMonitor.url + "/tasks");
	},
	stopAnalyserEvent: function() {
  		if (confirm("Do you realy like to terminate the Yaca-Agent process?") == true) {
			yacaMonitor.http.callDELETE(yacaMonitor.url + "/analyzer");
			YACA_Options.RUN_IMPORT = false;
    	}
	}

};

var changeModelViewFilter = function() {
	if (YACA_Options.MODEL_VIEW_FILTER_INVERT) {
		YACA_NodeRegexFilter = new RegExp('^((?!(' + YACA_Options.MODEL_VIEW_FILTER + ')).)*$');
	} else {
		YACA_NodeRegexFilter = new RegExp(YACA_Options.MODEL_VIEW_FILTER);
	}
};

// Support window resize
var resizeCallback = function() {
	var devicePixelRatio = window.devicePixelRatio || 1;
	yacaMonitor.renderer.setSize(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
	yacaMonitor.renderer.domElement.style.width = window.innerWidth + 'px';
	yacaMonitor.renderer.domElement.style.height = window.innerHeight + 'px';
	yacaMonitor.camera.updateProjectionMatrix();
};

var getTimeStampAsString = function() {
	var date = new Date();
	return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-'
		 + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '-' + date.getMilliseconds();
};

/**
 * Callback function to read model from server.
 */
var modelCallback = function(responseText) {
	yacaMonitor.modelText = responseText;
	yacaMonitor.lastUpdate = new Date();
	var input_model = JSON.parse(responseText);
	YACA_NBodySimulator.updateModel(input_model);
};

var optionsCallback = function(responseText) {
	if (responseText != "") {
		var options = JSON.parse(responseText);

	    YACA_Options.RUN_IMPORT = options.RUN_IMPORT;
		YACA_Options.RUN_IMPORT_INTERVAL = options.RUN_IMPORT_INTERVAL;
		YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST = options.RUN_IMPORT_ANALYSIS_FILTER_WHITE_LIST;
		YACA_Options.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST = options.RUN_IMPORT_ANALYSIS_FILTER_BLACK_LIST;
		YACA_Options.ACTIVE_PID =YACA_Options.ACTIVE_PID;

		// Show Nodes by
		YACA_Options.FILTER_ALL_CALL_DEEP_CALLED = options.FILTER_ALL_CALL_DEEP_CALLED;
		YACA_Options.FILTER_ALL_CALL_DEEP_CALLER = options.FILTER_ALL_CALL_DEEP_CALLER;

		// Filter Activity
		YACA_Options.RENDER_THRESHOLD = options.RENDER_THRESHOLD;
		YACA_Options.RENDER_LIMIT_NODE_NUMBER = options.RENDER_LIMIT_NODE_NUMBER;
		YACA_Options.RENDER_INACTIVE = options.RENDER_INACTIVE;

		// Extended Options
		YACA_Options.MODEL_VIEW_FILTER = options.MODEL_VIEW_FILTER;
		YACA_Options.MODEL_VIEW_FILTER_INVERT = options.MODEL_VIEW_FILTER_INVERT;

		// Extended Options
		YACA_Options.DISPLAY_DIRECTIONS = options.DISPLAY_DIRECTIONS;
		YACA_Options.DISPLAY_NAMES = options.DISPLAY_DIRECTIONS;

		// N-Body Simulation
		YACA_Options.RUN_SIMULATION = options.RUN_SIMULATION;
		YACA_Options.DISTANCE = options.DISTANCE;
		YACA_Options.SPRING = options.SPRING;
		YACA_Options.CHARGE = options.CHARGE;
		YACA_Options.GRAVITY = options.GRAVITY;
		YACA_Options.FORCE_2D = options.FORCE_2D;

		// Others ...
		YACA_Options.SPHERE_RADIUS_MINIMUM = options.SPHERE_RADIUS_MINIMUM;
		YACA_Options.SPHERE_RADIUS = options.SPHERE_RADIUS;
		YACA_Options.THETA = options.THETA;
	}
}

var vmCallback = function(responseText) {
	var input_vm = JSON.parse(responseText);

	if (typeof(yacaMonitor.gui_pid) !== "undefined") {
		yacaMonitor.gui_folder1.remove(yacaMonitor.gui_pid);
	}

	if (input_vm.process_id_available.length === 0) {
		input_vm.process_id_available.push(input_vm.process_id_active);
	}

	var _yacaMonitor = yacaMonitor;
	yacaMonitor.gui_pid = yacaMonitor.gui_folder1.add(YACA_Options, 'ACTIVE_PID',
		input_vm.process_id_available).listen().name('Process ID').onChange(
		function(value) {
			if (value) {
				_yacaMonitor.http.callPUT(_yacaMonitor.url + "/process/id", YACA_Options.ACTIVE_PID);
				_yacaMonitor.http.callDELETE(_yacaMonitor.url + "/tasks");
				_yacaMonitor.deleteWebGL(YACA_NBodySimulator.node_list, YACA_NBodySimulator.link_list);
				YACA_NBodySimulator.node_list = [];
				YACA_NBodySimulator.link_list = [];
				YACA_NBodySimulator.maxNodeCalls = 0;
			}
		});
	YACA_Options.ACTIVE_PID = input_vm.process_id_active;
};

var executeTimerGetYacaAnalyserModel = function() {
	if (YACA_Options.RUN_IMPORT) {
		yacaMonitor.http.callGET(yacaMonitor.url + "/process/", modelCallback);
	}
};

function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
}

window.onbeforeunload = function(e) {
	if (isRunning) {
		console.log("Store options = " + JSON.stringify(YACA_Options));
		yacaMonitor.http.callPUT(yacaMonitor.url + "/analyzer/options", JSON.stringify(YACA_Options));
		sleepFor(500);
		isRunning = false;
	}
};

var executeTimerRunNBodySimulation = function() {
	var iterations = 0;
	var start = new Date().getTime();
	YACA_NBodySimulator.applyFilter();
	if (YACA_Options.RUN_SIMULATION) {
		for (var count = 0; count < 20 && (new Date().getTime() - start < 10); count++) {
			YACA_NBodySimulator.simulateAllForces();
			iterations += 1;
		}
	}
	YACA_Options.DISPLAY_NAMES = YACA_Options.DISPLAY_NAMES && (YACA_NBodySimulator.node_list_visible.length <= 100);
	yacaMonitor.updateWebGL(YACA_NBodySimulator.node_list_visible_last, YACA_NBodySimulator.link_list_visible_last);
	yacaMonitor.updateWebGL(YACA_NBodySimulator.node_list_visible, YACA_NBodySimulator.link_list_visible);
	yacaMonitor.updateStatusLine(iterations);
};

/**
 * Sstart the application
 */
var isRunning = false;
var modelTimer;
var yacaMonitor = new YacaMonitor();
if (yacaMonitor.init()) {

	yacaMonitor.http.callGET(yacaMonitor.url + "/analyzer/options", optionsCallback);
	yacaMonitor.http.callGET(yacaMonitor.url + "/process/ids", vmCallback);

	initFileDragAndDrop();
	setInterval(executeTimerRunNBodySimulation, 150);
	modelTimer = setInterval(executeTimerGetYacaAnalyserModel, YACA_Options.RUN_IMPORT_INTERVAL);
	animate();
	setTimeout(guiEvents.resetRenderingEvent, 1500);

	// Register mouse event handler
	yacaMonitor.renderer.domElement.addEventListener('mousemove', mouseMoveEventHandler.bind(yacaMonitor));
	yacaMonitor.renderer.domElement.addEventListener('mousedown', mouseDownEventHandler.bind(yacaMonitor));


	isRunning = true;
}
