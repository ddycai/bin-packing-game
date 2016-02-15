var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
require('jquery-ui/draggable');
require('jquery-ui/droppable');

var items = [];    // List of item objects.
var bins = [];     // Stores which items are in which bins.
var binWeight = [];// Stores the weight of each bin.
var itemsPacked = 0;

// Constants
var BIN_DIM = 110;
var N_ITEMS = 10;
var UNITS = '';
var ITEM_DIM = 80;
var ITEM_MAX_WEIGHT = 80;

// Saving React rendered items.
var React_Items;
var React_Bins;

/*---------- React Classes ----------*/

/**
 * A single item to be packed into a bin.
 */
var Item = React.createClass({
  // Unhides and returns this item to its original position.
  returnPosition: function() {
    var $item = $(ReactDOM.findDOMNode(this));
    $item.show();
    $item.animate({
      top: "0px",
      left: "0px"
    });
  },
  componentDidMount: function() {
    $(ReactDOM.findDOMNode(this)).draggable({
      revert: true,
      revertDuration: 0,
    });
  },
  render: function() {
    var itemStyle = {
      width: (this.props.weight/ITEM_MAX_WEIGHT) * ITEM_DIM + 'px', 
      height: (this.props.weight/ITEM_MAX_WEIGHT) * ITEM_DIM + 'px'
    };
    if (this.props.weight >= ITEM_MAX_WEIGHT/2) {
      itemStyle.fontSize = '20px';
      itemStyle.fontWeight = 'bold';
    }
    return (
      <div className="item" data-weight={this.props.weight} data-id={this.props.id} 
        style={itemStyle}>
        {this.props.weight}
      </div>
    );
  }
});

/**
 * A list of Items.
 */
var ItemList = React.createClass({
  render: function() {
    var itemNodes = this.props.data.map(function(item) {
        return (
          <Item weight={item.weight} id={item.id} key={item.id} ref={'item' + item.id}>
            {item.weight}
          </Item>
        );
      });
    return (
      <div className="itemList">
        {itemNodes}
      </div>
    );
  }
});

/**
 * A single bin to pack items into.
 */
var Bin = React.createClass({
  getInitialState: function() {
    return {weight: 0, height: BIN_DIM, capacity: 100};
  },
  // Unpacks the bin's contents. Returns all items to their position.
  unpackBin: function() {
    this.setState({weight: 0, height: BIN_DIM, capacity: 100});
    var $bin = $(ReactDOM.findDOMNode(this));
    var j = this.props.id;

    $bin.find('.inner-bin').hide();
    binWeight[j] = 0;

    // For each item in this bucket, return it to its initial position.
    // We are using a ref here: we stored a reference (using ref=) to each
    // in ItemList to each of its Items.
    for (var key in React_Items.refs) {
      var item = React_Items.refs[key];
      var i = item.props.id;
      if (bins[j].hasOwnProperty(i) && bins[j][i] === true) {
        bins[j][i] = false;
        item.returnPosition();
        itemsPacked--;
      }
    }
  },
  // Adds the item to the bin if it's not already there.
  addItem: function(item, bin) {
    var i = item.attr('data-id');
    var j = this.props.id;
    // If bin already contains the item don't do anything.
    if (bins[j].hasOwnProperty(i) && bins[j][i] === true) {
      return;
    }

    bins[j][i] = true;
    binWeight[j] += items[i].weight;

    // Update the state of the bin.
    var height = Math.floor((binWeight[j]/100) * BIN_DIM);
    this.setState(
      {weight: binWeight[j], height: height, capacity: 100 - binWeight[j]}
    );

    bin.find('.inner-bin').show();
    item.hide();
    itemsPacked++;

    if (itemsPacked === items.length) {
      endGame();
    }
  },
  componentDidMount: function() {
    bins[this.props.id] = [];
    binWeight[this.props.id] = 0;

    var bin = this;

    // $ UI to make this bin droppable.
    $(ReactDOM.findDOMNode(this)).droppable({
      hoverClass: "bin-state-hover",
      accept: function(el) {
        if (!el.hasClass('item')) {
          return false;
        }
        // Don't accept items if weight exceeds box capacity.
        var i = $(el).attr('data-id');
        var j = bin.state.id;
        if (bin.state.weight + items[i].weight > 100) {
          return false;
        }
        return true;
      },
      drop: function( event, ui ) {
        return bin.addItem($(ui.draggable), $(this));
      },
    })
    .disableSelection();
  },
  render: function() {
    return (
      <div className="bin" onDoubleClick={this.unpackBin}>
        {this.state.capacity}
        <div className="inner-bin nonempty-bin" style={{ height: this.state.height }}>
          <span className="weight">{this.state.weight}</span>{UNITS}</div>
      </div>
    );
  }
});

/**
 * A list of bins.
 * Initially has one bin. Contains a button to add more bins.
 */
var BinList = React.createClass({
  getInitialState: function() {
    return {data: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]};
  },
  addBin: function() {
    var newBin = {id: this.state.data.length, weight: 0};
    var newData = this.state.data.concat(newBin);
    this.setState({data: newData});
  },
  render: function() {
    var binNodes = this.state.data.map(function(item) {
      return (
        <Bin id={item.id} key={item.id} ref={item.id} />
      );
    });
    return (
      <div>
        <div className="binList">
          {binNodes}
        </div>
        <button className="button-add btn btn-default" onClick={this.addBin}>
          <span className="glyphicon glyphicon-plus"></span> Add Box
        </button>
      </div>
    );
  }
});

/*---------- Functions ----------*/

/**
 * Generate a list of item objects.
 */
function generateItems(nItems, maxWeight) {

  // Custom random function.
  var randomItem = function(i) {
    var rnd = (Math.random() + Math.random() + Math.random()) / 3;
    var weight = Math.floor(rnd * (maxWeight - 1) + 1);
    return {id: i, weight: weight};
  };

  var sum = 0;
  for (var i = 0; i < nItems; i++) {
    items[i] = randomItem(i);
    sum += items[i].weight;
  }
  var diff = sum - 100 * Math.floor(sum / 100);
  if (diff >= 25 && diff <= 50) {
    items.push(randomItem(items.length));
  }
  return items;
}

/**
 * Packs the bins using the first fit algorithm.
 * Returns the number of bins packed.
 */
function firstFit(items) {
  // Stores the capacities of each bin.
  var bins = [];

  for (var i = 0; i < items.length; i++) {
    var packed = false;
    // Find the first bin that fits.
    for (var j = 0; j < bins.length; j++) {
      if (bins[j] >= items[i].weight) {
        bins[j] -= items[i].weight;
        packed = true;
        break;
      }
    }
    // If none exists, make a new one.
    if (!packed) {
      bins.push(100 - items[i].weight);
    }
  }
  return bins.length;
}

/**
 * Packs the bins using the first fit decreasing algorithm.
 * Returns the number of bins packed.
 */
function firstFitDecreasing(items_unsorted) {
  var items = items_unsorted.concat().sort().reverse();
  return firstFit(items);
}

function endGame() {
  var binsUsed = 0;

  for (var key in React_Bins.refs) {
    if (React_Bins.refs[key].state.weight > 0) {
      binsUsed++;
    }
  }

  // Find the best approx solution.
  var bestSolution = Math.min(firstFit(items), firstFitDecreasing(items));

  if (binsUsed > bestSolution) {
    $('#msg-not-good-enough').show();
  } else if (binsUsed === bestSolution) {
    $('#msg-good-work').show();
  } else {
    $('#msg-excellent').show();
  }
}

/**
 * Resets everything. (unpacks all the bins)
 */
function unpackAll() {
  bins = [];
  binWeight = [];
  itemsPacked = 0;

  $('.alert').hide();

  // Force React to clear bins.
  React_Bins.setState({data: []});
  for (var i = 0; i < 4; i++) {
    React_Bins.addBin();
  }

  // Return items.
  for (var key in React_Items.refs) {
    var item = React_Items.refs[key];
    item.returnPosition();
  }
}

/**
 * Start a new game.
 */
function restart() {
  items = [];
  bins = [];
  binWeight = [];
  itemsPacked = 0;

  $('.alert').hide();

  // Force React to clear bins.
  React_Bins.setState({data: []});
  for (var i = 0; i < 4; i++) {
    React_Bins.addBin();
  }

  $('#items').empty();
  React_Items = ReactDOM.render(
    <ItemList data={generateItems(N_ITEMS, ITEM_MAX_WEIGHT)} />,
    document.getElementById('items')
  );
}

$(document).ready(function() {
  $('.close').click(function() {
    $(this).parent().hide();
  });

  $('.button-new-game').click(function() {
    restart();
  });

  $('.button-reset').click(function() {
    unpackAll();
  });

  // Render react elements.
  React_Items = ReactDOM.render(
    <ItemList data={generateItems(N_ITEMS, ITEM_MAX_WEIGHT)} />,
    document.getElementById('items')
  );

  React_Bins = ReactDOM.render(
    <BinList />,
    document.getElementById('bins')
  );
});