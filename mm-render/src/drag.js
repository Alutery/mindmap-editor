import * as d3 from "d3";
import * as $ from "jquery";

export function dragStart(self) {
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

export function dragged(self) {
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

export function dragEnd(self) {
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
            self.updateMaxLabelLength.bind(self);

            // self.sortTree();
            self.endDrag(self);
        } else {
            self.endDrag(self);
        }
    }
}

export function initiateDrag(d, domNode, self) {
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

export function endDrag(self) {
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
