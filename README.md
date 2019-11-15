# node-red-contrib-ui-statechart
[![NPM version][npm-image]][npm-url]
[![CodeFactor](https://www.codefactor.io/repository/github/hotnipi/node-red-contrib-ui-statechart/badge)](https://www.codefactor.io/repository/github/hotnipi/node-red-contrib-ui-statechart)
![npm](https://img.shields.io/npm/dm/node-red-contrib-ui-statechart)

[npm-image]: http://img.shields.io/npm/v/node-red-contrib-ui-statechart.svg
[npm-url]: https://npmjs.org/package/node-red-contrib-ui-statechart
## Description
Node-RED dashboard widget. Bar chart to visualize numeric values in relation, together with state represented by color.

## Configuration
### Series

Configuring the series is required. Series presented as name of the bar. Make them short as they do not rotate or scale.
Configuration input of the series must be filled with `comma separated string`. Avoid space unless it is intentional.

For example: `dog,cat,cow,sheep,goat`

In addition the series can be automatically generated for 24 hours.  
By using shortcut `24H` the series generated with format `00,01,02,...,22,23`

Shortcut `24h` generates series without leading zeros - `0,1,2,...,22,23`

Using valid shortcut adds option to turn on the highlight of bar represents current hour. To do so, use syntax `24H|L`


### Other configurable options     
* Hide or show values
* Color of bars
* Font sizes
* Color of texts  

## Input

`msg.payload` should carry an array of Object(s) where:
required properties are: 

   * `series`  - (string) name of series
   * `value`  - (number) value
   * `state`  - (boolean) state

`msg.payload = [{series:"A",value:123,state:true},{series:"D",value:32,state:false}]`