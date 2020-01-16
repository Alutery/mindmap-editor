import * as Xml2Tree from "./xml2Tree";
import * as $ from 'jquery';
import * as path from 'path';
import {saveAs} from 'file-saver';


/**
 * Default config.
 * @type {{duration: number, panSpeed: number, panBoundary: number, isAttributes: boolean, secondLevelNodes: []}}
 */
const defaults = {
    secondLevelNodes: [],
    isAttributes: true,

    // panning variables
    panSpeed: 200,
    panBoundary: 20, // Within 20px from edges will pan when dragging.

    duration: 750,
};


export default class MindMapRender {

    constructor(config = []) {
        this.setConfig(config);
    }

    open(file) {
        this.init(file);
    }

    /**
     * Set configuration.
     */
    setConfig(config) {
        Object.assign(this, defaults, config);
    }

    /**
     * Initialize the tree.
     */
    init(file) {
        this.treeData = this.getData(file);

        // Calculate total nodes, max label length
        this.totalNodes = 0;
        this.maxLabelLength = 0;

        // variables for drag/drop
        this.selectedNode = null;
        this.draggingNode = null;

        this.i = 0;

        // size of the diagram
        this.viewerWidth = $(document).width();
        this.viewerHeight = $(document).height();

        this.tree = d3.layout.tree()
            .size([this.viewerHeight, this.viewerWidth]);

        // Define the root
        this.root = this.treeData;
        this.root.x0 = this.viewerHeight / 2;
        this.root.y0 = 0;

        this.nodes = null;

        // define a d3 diagonal projection for use by the node paths later on.
        this.diagonal = d3.svg.diagonal()
            .projection(function (d) {
                return [d.y, d.x];
            });
        // let self = this;
        // Call visit function to establish maxLabelLength
        this.visit(this.treeData, (d) => {
            this.totalNodes++;
            this.maxLabelLength = Math.max(d.name.length, this.maxLabelLength);
        }, (d) => {
            return d.children && d.children.length > 0 ? d.children : null;
        });

        // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
        this.zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", () => {
            this.svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

        // define the baseSvg, attaching a class for styling and the zoomListener
        $("#tree-container").empty();
        this.baseSvg = d3.select("#tree-container").append("svg")
            .attr("width", this.viewerWidth)
            .attr("height", this.viewerHeight)
            .attr("class", "overlay")
            .call(this.zoomListener);


        this.dragListener = d3.behavior.drag()
            .on("dragstart", this.dragStart(this))
            .on("drag", this.dragged(this))
            .on("dragend", this.dragEnd(this));


        // Append a group which holds all nodes and which the zoom Listener can act upon.
        this.svgGroup = this.baseSvg.append("g");

        // document.getElementById("expandAll").addEventListener("click", this.expandAll.bind(this);
        // document.getElementById("collapseAll").addEventListener("click", this.collapseAll.bind(this);

        // Define a context (popup) menu
        this.menu =
            [
                {
                    title: "Rename",
                    action: (elm, d, i) => {
                        let result = prompt('Change the name of the node', d.name);
                        if (result) {
                            d.name = result;
                            this.update(this.root);
                            this.centerNode(d);
                        }
                    }
                },
                {
                    title: 'Add a node',
                    action: (elm, d, i) => {
                        let newNodeName = prompt('Name of the new node', 'New Node');
                        if (!newNodeName) {
                            return;
                        }
                        let newNode = {
                            'value': {
                                'TEXT': newNodeName,
                            },
                            'name': newNodeName,
                            'type': 'node',
                            "children": [],
                            "parent": d,
                            'depth': d.depth + 1,
                        };

                        let currentNode = this.tree.nodes(d);

                        if (currentNode[0]._children != null) {
                            currentNode[0]._children.push(newNode);
                            d.children = d._children;
                            d._children = null;
                        }
                        else if (currentNode[0].children != null && currentNode[0]._children == null) {
                            currentNode[0].children.push(newNode);
                        } else {
                            currentNode[0].children = [];
                            currentNode[0].children.push(newNode);
                            currentNode[0].children.x = d.x0;
                            currentNode[0].children.y = d.y0;
                        }

                        this.update(this.root);
                        this.expand(currentNode);
                    }
                },
                {
                    title: 'Delete a node',
                    action: (elm, d, i) => {
                        let delName = d.name;
                        if (d.parent && d.parent.children) {
                            let nodeToDelete = _.where(d.parent.children, {
                                name: delName
                            });
                            if (nodeToDelete) {
                                if (nodeToDelete[0].children != null || nodeToDelete[0]._children != null) {
                                    if (confirm('Deleting this node will delete all its children too! Proceed?')) {
                                        d.parent.children = _.without(d.parent.children, nodeToDelete[0]);
                                        this.update(this.root);
                                    }
                                } else {
                                    d.parent.children = _.without(d.parent.children, nodeToDelete[0]);
                                }
                            }
                            this.update(this.root);
                        } else {
                            alert('Cannot delete the root!');
                        }
                    }
                }
            ];

        d3.contextMenu = (menu, openCallback) => {

            // create the div element that will hold the context menu
            d3.selectAll('.d3-context-menu').data([1])
                .enter()
                .append('div')
                .attr('class', 'd3-context-menu');

            // close menu
            d3.select('body').on('click.d3-context-menu', function () {
                d3.select('.d3-context-menu').style('display', 'none');
            });

            // this gets executed when a contextmenu event occurs
            return (data, index) => {
                let elm = this;

                d3.selectAll('.d3-context-menu').html('');
                let list = d3.selectAll('.d3-context-menu').append('ul');
                list.selectAll('li').data(menu).enter()
                    .append('li')
                    .html(function (d) {
                        return d.title;
                    })
                    .on('click', (d, i) => {
                        d.action(elm, data, index);
                        d3.select('.d3-context-menu').style('display', 'none');
                    });

                // the openCallback allows an action to fire before the menu is displayed
                // an example usage would be closing a tooltip
                if (openCallback) openCallback(data, index);

                // display context menu
                d3.select('.d3-context-menu')
                    .style('left', (d3.event.pageX - 2) + 'px')
                    .style('top', (d3.event.pageY - 2) + 'px')
                    .style('display', 'block');

                d3.event.preventDefault();
            };
        };

        // Layout the tree initially and center on the root node.
        this.update(this.root);
        this.centerNode(this.root);
    }

    dragStart(self) {
        return function (d) {
            if (d == self.root) {
                return;
            }
            self.dragStarted = true;
            self.nodes = self.tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged.
            // Otherwise it will absorb the mouseover event and the underlying node will not detect it
            // d3.select(this).attr('pointer-events', 'none');
        }
    }

    dragged(self) {
        {
            return function (d) {
                if (this === self.root) {
                    return;
                }
                if (self.dragStarted) {
                    self.domNode = this;
                    self.initiateDrag(d, self.domNode, self);
                }

                // get coords of mouseEvent relative to svg container to allow for panning
                let relCoords = d3.mouse($('svg').get(0));
                if (relCoords[0] < self.panBoundary) {
                    self.panTimer = true;
                    self.pan(this, 'left');
                } else if (relCoords[0] > ($('svg').width() - self.panBoundary)) {
                    self.panTimer = true;
                    self.pan(this, 'right');
                } else if (relCoords[1] < self.panBoundary) {
                    self.panTimer = true;
                    self.pan(this, 'up');
                } else if (relCoords[1] > ($('svg').height() - self.panBoundary)) {
                    self.panTimer = true;
                    self.pan(this, 'down');
                } else {
                    try {
                        clearTimeout(self.panTimer);
                    } catch (e) {

                    }
                }
                d.x0 += d3.event.dy;
                d.y0 += d3.event.dx;
                let node = d3.select(this);
                node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
                self.updateTempConnector(self);
            }
        }
    }

    dragEnd(self) {
        return function (d) {
            if (d == self.root) {
                return;
            }
            self.domNode = this;
            if (self.selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                let index = self.draggingNode.parent.children.indexOf(self.draggingNode);
                if (index > -1) {
                    self.draggingNode.parent.children.splice(index, 1);
                }
                if (typeof self.selectedNode.children !== 'undefined' || typeof self.selectedNode._children !== 'undefined') {
                    if (typeof self.selectedNode.children !== 'undefined') {
                        self.selectedNode.children.push(self.draggingNode);
                    } else {
                        self.selectedNode._children.push(self.draggingNode);
                    }
                } else {
                    self.selectedNode.children = [];
                    self.selectedNode.children.push(self.draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                self.expand(self.selectedNode);
                // self.sortTree();
                self.endDrag(self);
            } else {
                self.endDrag(self);
            }
        }
    }

    /**
     * Sort the tree according to the node names.
     */
    sortTree() {
        this.tree.sort(function (a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }

    initiateDrag(d, domNode, self) {
        self.draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        self.svgGroup.selectAll("g.node").sort(function (a, b) { // select the parent and sort the path's
            if (a.id !== self.draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (self.nodes.length > 1) {
            // remove link paths
            self.links = self.tree.links(self.nodes);
            let nodePaths = self.svgGroup.selectAll("path.link")
                .data(self.links, function (d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            let nodesExit = self.svgGroup.selectAll("g.node")
                .data(self.nodes, function (d) {
                    return d.id;
                }).filter(function (d, i) {
                    return d.id !== self.draggingNode.id;

                }).remove();
        }

        // remove parent link
        let parentLink = self.tree.links(self.tree.nodes(self.draggingNode.parent));
        self.svgGroup.selectAll('path.link').filter(function (d, i) {
            if (d.target.id === self.draggingNode.id) {
                return true;
            }
            return false;
        }).remove();

        self.dragStarted = null;
    }

    endDrag(self) {
        self.selectedNode = null;
        d3.selectAll('.ghostCircle').attr('class', "ghostCircle");
        d3.select(self.domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(self.domNode).select('.ghostCircle').attr('pointer-events', '');
        self.updateTempConnector(self);
        if (self.draggingNode !== null) {
            self.update(self.root);
            self.centerNode(self.draggingNode);
            self.draggingNode = null;
        }
    }

    // Helper functions for collapsing and expanding nodes.

    collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach((d) => this.collapse(d));
            d.children = null;
        }
    }

    expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach((d) => this.expand(d));
            d._children = null;
        }
    }

    expandAll() {
        this.expand(this.root);
        this.update(this.root);
        this.centerNode(this.root);
    }

    collapseAll() {
        if (!this.root.children) {
            return;
        }

        let root = this.root;
        root.children.forEach(() => this.collapse);
        this.collapse(root);
        this.update(root);
        this.centerNode(root);
    }

    focusRoot() {
        this.centerNode(this.root);
    }

    /**
     * Get data from file (.mm or .json).
     * @returns {*}
     * @param file
     */
    getData(file) {
        let filePath = URL.createObjectURL(file);
        let extension = path.extname(file.name);
        this.fileName = path.basename(file.name);

        switch (extension) {
            case ".mm":
                return this.readMM(filePath);
            case ".json":
                return this.readJson(filePath);
            default:
                alert('Read error'); // throw exception ???
                return null;
        }
    }

    readMM(flePath) {
        let XMLText = Xml2Tree.readTextFile(flePath);
        let tagArray = Xml2Tree.XMLToArray(XMLText);  // returns an array of all nodes with related info
        let mapArray = Xml2Tree.arrayMapping(tagArray, this.secondLevelNodes, this.isAttributes);
        let treeData = Xml2Tree.arrayToJSON(mapArray);  // converts array into a JSON file

        return treeData[0]['children'][0];
    }

    readJson(flePath) {
        let JSONText = Xml2Tree.readTextFile(flePath);
        return JSON.parse(JSONText);
    }

    saveJson() {
        let blob = new Blob([this.getTreeData()], {type: "application/json"});
        saveAs(blob, `${this.fileName}.json`);
    }

    getTreeData() {
        const getCircularReplacer = (deletePorperties) => { //func that allows a circular json to be stringified
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (deletePorperties) {
                        delete value.id; //delete all properties you don't want in your json (not very convenient but a good temporary solution)
                        delete value.x0;
                        delete value.y0;
                        delete value.y;
                        delete value.x;
                        delete value.depth;
                        delete value.size;
                        delete value.parent;
                    }
                    if (seen.has(value)) {
                        return;
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        let myRoot = JSON.stringify(this.root, getCircularReplacer(false)); //Stringify a first time to clone the root object (it's allow you to delete properties you don't want to save)
        let myvar = JSON.parse(myRoot);
        myvar = JSON.stringify(myvar, getCircularReplacer(true), 4); //Stringify a second time to delete the propeties you don't need

        return myvar;
    }

    update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        let levelWidth = [1];
        let childCount = (level, n) => {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach((d) => {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, this.root);

        let newHeight = d3.max(levelWidth) * 30; // 25 pixels per line
        this.tree = this.tree.size([newHeight, this.viewerWidth]);

        // Compute the new tree layout.
        let nodes = this.tree.nodes(this.root).reverse(),
            links = this.tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function (d) {
            d.y = (d.depth * (this.maxLabelLength * 7)); //maxLabelLength * 10px
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        }, this);

        // Update the nodes…
        let node = this.svgGroup.selectAll("g.node")
            .data(nodes, (d) => {
                return d.id || (d.id = ++(this.i));
            });

        // Enter any new nodes at the parent's previous position.
        let nodeEnter = node.enter().append("g")
            .call(this.dragListener)
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', (d) => {
                if (d3.event.defaultPrevented) return; // click suppressed
                d = this.toggleChildren(d);
                this.update(d);
                this.centerNode(d);
            });

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .on('contextmenu', d3.contextMenu(this.menu));
        // adding popup dialogue for changing/adding/deleting nodes to circles


        nodeEnter.append("text")
            .attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function (d) {
                return d.name;
            })
            .style("fill-opacity", 0)
            .on('contextmenu', d3.contextMenu(this.menu));
        // adding popup dialogue for changing/adding/deleting nodes for text captions too

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
            .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", (node) => {
                this.overCircle(node);
            })
            .on("mouseout", (node) => {
                this.outCircle(node);
            });

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function (d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        let nodeUpdate = node.transition()
            .duration(this.duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        let nodeExit = node.exit().transition()
            .duration(this.duration)
            .attr("transform", function (d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        let link = this.svgGroup.selectAll("path.link")
            .data(links, function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", (d) => {
                let o = {
                    x: source.x0,
                    y: source.y0
                };
                return this.diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(this.duration)
            .attr("d", this.diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(this.duration)
            .attr("d", (d) => {
                let o = {
                    x: source.x,
                    y: source.y
                };
                return this.diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // TODO: Pan function, can be better implemented.
    pan(domNode, direction) {
        let speed = this.panSpeed;
        let translateCoords;
        let scaleX, scaleY;
        let scale;
        let translateX, translateY;

        if (this.panTimer) {
            clearTimeout(this.panTimer);
            translateCoords = d3.transform(this.svgGroup.attr("transform"));
            if (direction === 'left' || direction === 'right') {
                translateX = direction === 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction === 'up' || direction === 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction === 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = this.zoomListener.scale();
            this.svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            this.zoomListener.scale(this.zoomListener.scale());
            this.zoomListener.translate([translateX, translateY]);
            this.panTimer = setTimeout(() => {
                this.pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
    centerNode(source) {
        let scale = this.zoomListener.scale();
        let x = -source.y0;
        let y = -source.x0;

        x = x * scale + this.viewerWidth / 2;
        y = y * scale + this.viewerHeight / 2;
        d3.select('g').transition()
            .duration(this.duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        this.zoomListener.scale(scale);
        this.zoomListener.translate([x, y]);
    }

    // Toggle children function

    toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Function to update the temporary connector indicating dragging affiliation
    updateTempConnector(self) {
        let data = [];
        if (self.draggingNode != null && self.selectedNode != null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: self.selectedNode.y0,
                    y: self.selectedNode.x0
                },
                target: {
                    x: self.draggingNode.y0,
                    y: self.draggingNode.x0
                }
            }];
        }

        let link = this.svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    overCircle(d) {
        this.selectedNode = d;
        this.updateTempConnector(this);
    };

    outCircle(d) {
        this.selectedNode = null;
        this.updateTempConnector(this);
    };


    // A recursive helper function for performing some setup by walking through all nodes
    visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        let children = childrenFn(parent);
        if (children) {
            let count = children.length;
            for (let i = 0; i < count; i++) {
                this.visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Define the zoom function for the zoomable tree
    // zoom() {
    //     this.svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    // }
}
