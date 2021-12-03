import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

// Create the drawing canvas
const canvas = document.createElement("canvas");
// Position it absolutely
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
// Set width and height
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// Insert canvas into DOM
app.appendChild(canvas);

class SimulationNode {
	pressure: number;
	x: number;
	y: number;
	connections: number[];

	constructor(pressure: number, x: number, y: number) {
		this.pressure = pressure;
		this.x = x;
		this.y = y;
		this.connections = [];
	}
}

async function draw_node(sn: SimulationNode, canvas: HTMLCanvasElement) {
	let context = canvas.getContext("2d")!;
	context.beginPath();
	context.arc(sn.x, sn.y, 10, 0, 2 * Math.PI);
	context.closePath();
	context.fillStyle = `hsla(181, 100%, 47%, ${sn.pressure})`;
	context.fill();
    context.stroke();
    context.font = `monospace`;
    let textx = sn.x;
    let texty = sn.y + 15;
    if (canvas.height - sn.y < 20) {
        texty = sn.y - 15;
    }
    if (canvas.width - sn.x < 20) {
        textx = sn.x - 20;
    }
    context.fillStyle = 'hsla(0, 100%, 0%, 1)';
    context.fillText(`Pressure: ${sn.pressure}`, textx, texty);
}

class SimulationGraph {
	nodes: SimulationNode[];

	constructor() {
		this.nodes = [];
	}

	addNode(x: number, y: number) {
		this.nodes.push(new SimulationNode(0, x, y));
	}

	connect(n1: number, n2: number) {
		this.nodes[n1].connections.push(n2);
		this.nodes[n2].connections.push(n1);
	}

	clone() {
		let c = new SimulationGraph();
		for (let node of this.nodes) {
            let nsn = new SimulationNode(node.pressure, node.x, node.y);
			nsn.connections = [...node.connections]
            c.nodes.push(nsn);

		}
		return c;
	}
}

async function draw_graph(sg : SimulationGraph, canvas: HTMLCanvasElement) {
    let context = canvas.getContext('2d')!;
    for (let node of sg.nodes) {
        for (let neighbour of node.connections) {
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(sg.nodes[neighbour].x, sg.nodes[neighbour].y);
            context.closePath();
            context.stroke();
        }
        draw_node(node, canvas);
    }
}

function randomGraph(maxnodes: number, connectionDensity: number, sourceCount: number) {
	let g = new SimulationGraph();

    // Generate the grapn nodes
	while (g.nodes.length < maxnodes) {
        // Generate a candidate position
		let candidatePosX = Math.floor(Math.random() * canvas.width);
		let candidatePosY = Math.floor(Math.random() * canvas.height);

        // Find minimum manhattan distance from all other nodes
		let distances = g.nodes.map(
			(node) =>
				Math.abs(candidatePosX - node.x) +
				Math.abs(candidatePosY - node.y)
		);
		let minDist = distances.reduce((p, c, _i) => {
			return c < p ? c : p;
		}, Infinity);

        // If minimum distance is less than some threshold 
        // i.e. the point is well separated from other points
        // We can add it to the graph
		if (minDist > (canvas.width + canvas.height) / maxnodes) {
			g.nodes.push(new SimulationNode(0, candidatePosX, candidatePosY));
		}
	}

    // Create connections
    for (let i = 0; i < g.nodes.length; i++) {
        for (let j = i; j < g.nodes.length; j++) {
            if (Math.random() < connectionDensity) {
                g.connect(i, j);
            }
        }
    }

    // Make sources
    for (let i = 0; i < sourceCount; i++) {
        let candidate = Math.floor(Math.random() * maxnodes)
        while (g.nodes[candidate].pressure != 0.0) {
            candidate = Math.floor(Math.random() * maxnodes);
        }
        g.nodes[candidate].pressure = 1.0;
    }

    return g;
}

let g = randomGraph(10, 0.2, 2);
let other = g.clone();
let current = g.clone();

while (true) {
    canvas.getContext('2d')!.fillStyle = 'hsla(100, 0%, 100%, 1.0)';
    canvas.getContext('2d')!.fillRect(0, 0, canvas.width, canvas.height);
    const PRESSURE_SCALE = 0.01;
    for (let n = 0; n < g.nodes.length; n++) {
        let ownPressure = current.nodes[n].pressure;
        let deltaP = 0.0;
        for (let neighbour of current.nodes[n].connections) {
            deltaP += current.nodes[neighbour].pressure - ownPressure;
        }
        other.nodes[n].pressure = ownPressure + deltaP * PRESSURE_SCALE;
        if (other.nodes[n].pressure < 0) {
            other.nodes[n].pressure = 0;
        }
    }
    draw_graph(current, canvas);
    await new Promise(r => setTimeout(r, 500));
    [current, other] = [other, current]
}
