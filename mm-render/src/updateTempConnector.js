// Function to update the temporary connector indicating dragging affiliation
import * as d3 from "d3";

export default function updateTempConnector(self) {
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
}
