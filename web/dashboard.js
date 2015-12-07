// You can set the following variables before loading this script:
//
// var netdataNoDygraphs = true;		// do not use dygraph
// var netdataNoSparklines = true;		// do not use sparkline
// var netdataNoPeitys = true;			// do not use peity
// var netdataNoGoogleCharts = true;	// do not use google
// var netdataNoMorris = true;			// do not use morris
// var netdataDontStart = true;			// do not start the thread to process the charts
//
// You can also set the default netdata server, using the following.
// When this variable is not set, we assume the page is hosted on your
// netdata server already.
// var netdataServer = "http://yourhost:19999"; // set your NetData server

(function(window)
{
	// fix IE bug with console
	if(!window.console){ window.console = {log: function(){} }; }

	var NETDATA = window.NETDATA || {};

	// ----------------------------------------------------------------------------------------------------------------
	// Detect the netdata server

	// http://stackoverflow.com/questions/984510/what-is-my-script-src-url
	// http://stackoverflow.com/questions/6941533/get-protocol-domain-and-port-from-url
	NETDATA._scriptSource = function(scripts) {
		var script = null, base = null;

		if(typeof document.currentScript != 'undefined') {
			script = document.currentScript;
		}
		else {
			var all_scripts = document.getElementsByTagName('script');
			script = all_scripts[all_scripts.length - 1];
		}

		if (script.getAttribute.length != 'undefined')
			script = script.src;
		else
			script = script.getAttribute('src', -1);

		var link = document.createElement('a');
		link.setAttribute('href', script);

		if(!link.protocol || !link.hostname) return null;

		base = link.protocol;
		if(base) base += "//";
		base += link.hostname;

		if(link.port) base += ":" + link.port;
		base += "/";

		return base;
	};

	if(typeof netdataServer != 'undefined')
		NETDATA.serverDefault = netdataServer;
	else
		NETDATA.serverDefault = NETDATA._scriptSource();

	if(NETDATA.serverDefault.slice(-1) != '/')
		NETDATA.serverDefault += '/';

	// default URLs for all the external files we need
	// make them RELATIVE so that the whole thing can also be
	// installed under a web server
	NETDATA.jQuery       	= NETDATA.serverDefault + 'lib/jquery-1.11.3.min.js';
	NETDATA.peity_js     	= NETDATA.serverDefault + 'lib/jquery.peity.min.js';
	NETDATA.sparkline_js 	= NETDATA.serverDefault + 'lib/jquery.sparkline.min.js';
	NETDATA.dygraph_js   	= NETDATA.serverDefault + 'lib/dygraph-combined.js';
	NETDATA.raphael_js   	= NETDATA.serverDefault + 'lib/raphael-min.js';
	NETDATA.morris_js    	= NETDATA.serverDefault + 'lib/morris.min.js';
	NETDATA.morris_css   	= NETDATA.serverDefault + 'css/morris.css';
	NETDATA.dashboard_css	= NETDATA.serverDefault + 'dashboard.css';
	NETDATA.google_js    	= 'https://www.google.com/jsapi';

	// these are the colors Google Charts are using
	// we have them here to attempt emulate their look and feel on the other chart libraries
	// http://there4.io/2012/05/02/google-chart-color-list/
	NETDATA.colors		= [ '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#3B3EAC', '#0099C6',
							'#DD4477', '#66AA00', '#B82E2E', '#316395', '#994499', '#22AA99', '#AAAA11',
							'#6633CC', '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC' ];

	// an alternative set
	// http://www.mulinblog.com/a-color-palette-optimized-for-data-visualization/
	//                         (blue)     (red)      (orange)   (green)    (pink)     (brown)    (purple)   (yellow)   (gray)
	//NETDATA.colors 		= [ '#5DA5DA', '#F15854', '#FAA43A', '#60BD68', '#F17CB0', '#B2912F', '#B276B2', '#DECF3F', '#4D4D4D' ];

	// ----------------------------------------------------------------------------------------------------------------
	// the defaults for all charts

	// if the user does not specify any of these, the following will be used

	NETDATA.chartDefaults = {
		host: NETDATA.serverDefault,	// the server to get data from
		width: '100%',					// the chart width - can be null
		height: '100%',					// the chart height - can be null
		min_width: null,				// the chart minimum width - can be null
		library: 'dygraph',				// the graphing library to use
		method: 'average',				// the grouping method
		before: 0,						// panning
		after: -600,					// panning
		pixels_per_point: 1,			// the detail of the chart
		fill_luminance: 0.8				// luminance of colors in solit areas
	}

	// ----------------------------------------------------------------------------------------------------------------
	// global options

	NETDATA.options = {
		targets: null,					// an array of all the DOM elements that are
										// currently visible (independently of their
										// viewport visibility)

		updated_dom: true,				// when true, the DOM has been updated with
										// new elements we have to check.

		auto_refresher_fast_weight: 0,	// this is the current time in ms, spent
										// rendering charts continiously.
										// used with .current.fast_render_timeframe

		page_is_visible: true,			// when true, this page is visible

		auto_refresher_stop_until: 0,	// timestamp in ms - used internaly, to stop the
										// auto-refresher for some time (when a chart is
										// performing pan or zoom, we need to stop refreshing
										// all other charts, to have the maximum speed for
										// rendering the chart that is panned or zoomed).
										// Used with .current.global_pan_sync_time

		last_resized: 0,				// the timestamp of the last resize request

		// the current profile
		// we may have many...
		current: {
			pixels_per_point: 1,		// the minimum pixels per point for all charts
										// increase this to speed javascript up
										// each chart library has its own limit too
										// the max of this and the chart library is used
										// the final is calculated every time, so a change
										// here will have immediate effect on the next chart
										// update

			idle_between_charts: 50,	// ms - how much time to wait between chart updates

			fast_render_timeframe: 200, // ms - render continously until this time of continious
										// rendering has been reached
										// this setting is used to make it render e.g. 10
										// charts at once, sleep idle_between_charts time
										// and continue for another 10 charts.

			idle_between_loops: 200,	// ms - if all charts have been updated, wait this
										// time before starting again.

			idle_lost_focus: 500,		// ms - when the window does not have focus, check
										// if focus has been regained, every this time

			global_pan_sync_time: 500,	// ms - when you pan or zoon a chart, the background
										// autorefreshing of charts is paused for this amount
										// of time

			sync_selection_delay: 1500,	// ms - when you pan or zoom a chart, wait this amount
										// of time before setting up synchronized selections
										// on hover.

			sync_selection: true,		// enable or disable selection sync

			sync_pan_and_zoom: true,	// enable or disable pan and zoom sync

			update_only_visible: true	// enable or disable visibility management
		},

		debug: {
			show_boxes: 		0,
			main_loop: 			0,
			focus: 				0,
			visibility: 		0,
			chart_data_url: 	0,
			chart_errors: 		1,
			chart_timing: 		0,
			chart_calls: 		0,
			libraries: 			0,
			dygraph: 			0
		}
	}

	if(NETDATA.options.debug.main_loop) console.log('welcome to NETDATA');

	window.onresize = function(event) {
		NETDATA.options.last_resized = new Date().getTime();
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Error Handling

	NETDATA.errorCodes = {
		100: { message: "Cannot load chart library", alert: true },
		101: { message: "Cannot load jQuery", alert: true },
		402: { message: "Chart library not found", alert: false },
		403: { message: "Chart library not enabled/is failed", alert: false },
		404: { message: "Chart not found", alert: false }
	};
	NETDATA.errorLast = {
		code: 0,
		message: "",
		datetime: 0
	};

	NETDATA.error = function(code, msg) {
		NETDATA.errorLast.code = code;
		NETDATA.errorLast.message = msg;
		NETDATA.errorLast.datetime = new Date().getTime();

		console.log("ERROR " + code + ": " + NETDATA.errorCodes[code].message + ": " + msg);

		if(NETDATA.errorCodes[code].alert)
			alert("ERROR " + code + ": " + NETDATA.errorCodes[code].message + ": " + msg);
	}

	NETDATA.errorReset = function() {
		NETDATA.errorLast.code = 0;
		NETDATA.errorLast.message = "You are doing fine!";
		NETDATA.errorLast.datetime = 0;
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Chart Registry

	// When multiple charts need the same chart, we avoid downloading it
	// multiple times (and having it in browser memory multiple time)
	// by using this registry.

	// Every time we download a chart definition, we save it here with .add()
	// Then we try to get it back with .get(). If that fails, we download it.

	NETDATA.chartRegistry = {
		charts: {},

		add: function(host, id, data) {
			host = host.replace(/:/g, "_").replace(/\//g, "_");
			id   =   id.replace(/:/g, "_").replace(/\//g, "_");

			if(typeof this.charts[host] == 'undefined')
				this.charts[host] = {};

			this.charts[host][id] = data;
		},

		get: function(host, id) {
			host = host.replace(/:/g, "_").replace(/\//g, "_");
			id   =   id.replace(/:/g, "_").replace(/\//g, "_");

			if(typeof this.charts[host] == 'undefined')
				return null;

			if(typeof this.charts[host][id] == 'undefined')
				return null;

			return this.charts[host][id];
		}
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Global Pan and Zoom on charts

	// Using this structure are synchronize all the charts, so that
	// when you pan or zoom one, all others are automatically refreshed
	// to the same timespan.

	NETDATA.globalPanAndZoom = {
		seq: 0,					// timestamp ms
								// every time a chart is panned or zoomed
								// we set the timestamp here
								// then we use it as a sequence number
								// to find if other charts are syncronized
								// to this timerange

		master: null,			// the master chart (state), to which all others
								// are synchronized

		force_before_ms: null,	// the timespan to sync all other charts 
		force_after_ms: null,

		// set a new master
		setMaster: function(state, after, before) {
			if(!NETDATA.options.current.sync_pan_and_zoom) return;

			if(this.master && this.master != state)
				this.master.resetChart();

			this.master = state;
			this.seq = new Date().getTime();
			this.force_after_ms = after;
			this.force_before_ms = before;
		},

		// clear the master
		clearMaster: function() {
			if(this.master) {
				var state = this.master;
				this.master = null; // prevent infinite recursion
				this.seq = 0;
				state.resetChart();
				NETDATA.options.auto_refresher_stop_until = 0;
			}
			
			this.master = null;
			this.seq = 0;
			this.after_ms = 0;
			this.before_ms = 0;
			this.force_after_ms = 0;
			this.force_before_ms = 0;
		},

		// is the given state the master of the global
		// pan and zoom sync?
		isMaster: function(state) {
			if(this.master == state) return true;
			return false;
		},

		// are we currently have a global pan and zoom sync?
		isActive: function() {
			if(this.master) return true;
			return false;
		},

		// check if a chart, other than the master
		// needs to be refreshed, due to the global pan and zoom
		shouldBeAutoRefreshed: function(state) {
			if(!this.master || !this.seq)
				return false;

			if(state.needsResize())
				return true;

			if(state.follows_global == this.seq)
				return false;

			return true;
		}
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Our state object, where all per-chart values are stored

	NETDATA.chartInitialState = function(element) {
		self = $(element);

		var state = {
			uuid: NETDATA.guid(),	// GUID - a unique identifier for the chart
			id: self.data('netdata'),	// string - the name of chart

			// the user given dimensions of the element
			width: self.data('width') || NETDATA.chartDefaults.width,
			height: self.data('height') || NETDATA.chartDefaults.height,

			// string - the netdata server URL, without any path
			host: self.data('host') || NETDATA.chartDefaults.host,

			// string - the grouping method requested by the user
			method: self.data('method') || NETDATA.chartDefaults.method,

			// the time-range requested by the user
			after: self.data('after') || NETDATA.chartDefaults.after,
			before: self.data('before') || NETDATA.chartDefaults.before,

			// the pixels per point requested by the user
			pixels_per_point: self.data('pixels-per-point') || 1,
			points: self.data('points') || null,

			// the dimensions requested by the user
			dimensions: self.data('dimensions') || null,

			// the chart library requested by the user
			library_name: self.data('chart-library') || NETDATA.chartDefaults.library,
			library: null,			// object - the chart library used

			element: element,		// the element already created by the user
			element_chart: null,	// the element with the chart
			element_chart_id: null,
			element_legend: null, 	// the element with the legend of the chart (if created by us)
			element_legend_id: null,
			
			chart_url: null,		// string - the url to download chart info
			chart: null,			// object - the chart as downloaded from the server

			downloaded_ms: 0,		// milliseconds - the timestamp we downloaded the chart
			created_ms: 0,			// boolean - the timestamp the chart was created
			validated: false, 		// boolean - has the chart been validated?
			enabled: true, 			// boolean - is the chart enabled for refresh?
			paused: false,			// boolean - is the chart paused for any reason?
			selected: false,		// boolean - is the chart shown a selection?
			debug: false,			// boolena - console.log() debug info about this chart

			updates_counter: 0,		// numeric - the number of refreshes made so far
			updates_since_last_creation: 0,

			follows_global: 0,		// the sequence number of the global synchronization
									// between chart.
									// Used with NETDATA.globalPanAndZoom.seq

			last_resized: 0,		// the last time the chart was resized

			mode: null, 			// auto, pan, zoom
									// this is a pointer to one of the sub-classes below

			auto: {
				name: 'auto',
				autorefresh: true,
				url: 'invalid://',	// string - the last url used to update the chart
				last_updated_ms: 0, // milliseconds - the timestamp of last refresh
				view_update_every: 0, 	// milliseconds - the minimum acceptable refresh duration
				after_ms: 0,		// milliseconds - the first timestamp of the data
				before_ms: 0,		// milliseconds - the last timestamp of the data
				points: 0,			// number - the number of points in the data
				data: null,			// the last downloaded data
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
				first_entry_ms: null,
				last_entry_ms: null,
			},
			pan: {
				name: 'pan',
				autorefresh: false,
				url: 'invalid://',	// string - the last url used to update the chart
				last_updated_ms: 0, // milliseconds - the timestamp of last refresh
				view_update_every: 0, 	// milliseconds - the minimum acceptable refresh duration
				after_ms: 0,		// milliseconds - the first timestamp of the data
				before_ms: 0,		// milliseconds - the last timestamp of the data
				points: 0,			// number - the number of points in the data
				data: null,			// the last downloaded data
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
				first_entry_ms: null,
				last_entry_ms: null,
			},
			zoom: {
				name: 'zoom',
				autorefresh: false,
				url: 'invalid://',	// string - the last url used to update the chart
				last_updated_ms: 0, // milliseconds - the timestamp of last refresh
				view_update_every: 0, 	// milliseconds - the minimum acceptable refresh duration
				after_ms: 0,		// milliseconds - the first timestamp of the data
				before_ms: 0,		// milliseconds - the last timestamp of the data
				points: 0,			// number - the number of points in the data
				data: null,			// the last downloaded data
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
				first_entry_ms: null,
				last_entry_ms: null,
			},

			refresh_dt_ms: 0,		// milliseconds - the time the last refresh took
			refresh_dt_element_name: self.data('dt-element-name') || null,	// string - the element to print refresh_dt_ms
			refresh_dt_element: null,

			log: function(msg) {
				console.log(this.id + ' (' + this.library_name + ' ' + this.uuid + '): ' + msg);
			},

			setSelection: function(t) {
				if(typeof this.library.setSelection == 'function') {
					if(this.library.setSelection(this, t))
						this.selected = true;
					else
						this.selected = false;
				}
				else this.selected = true;

				if(this.selected && this.debug) this.log('selection set to ' + t.toString());

				return this.selected;
			},

			clearSelection: function() {
				if(this.selected) {
					if(typeof this.library.clearSelection == 'function') {
						if(this.library.clearSelection(this))
							this.selected = false;
						else
							this.selected = true;
					}
					else this.selected = false;
					
					if(!this.selected && this.debug) this.log('selection cleared');
				}

				return this.selected;
			},

			// find if a timestamp (ms) is shown in the current chart
			timeIsVisible: function(t) {
				if(t >= this.current.after_ms && t <= this.current.before_ms)
					return true;
				return false;
			},

			calculateRowForTime: function(t) {
				if(!this.timeIsVisible(t)) return -1;

				var r = Math.floor((t - this.current.after_ms) / this.current.view_update_every);
				// console.log(this.current.data);

				return r;
			},

			pauseChart: function() {
				if(!this.paused) {
					if(this.debug) this.log('paused');
					this.paused = true;
				}
			},

			unpauseChart: function() {
				if(this.paused) {
					if(this.debug) this.log('unpaused');
					this.paused = false;
				}
			},

			resetChart: function() {
				if(NETDATA.globalPanAndZoom.isMaster(this))
					NETDATA.globalPanAndZoom.clearMaster();

				if(state.current.name != 'auto')
					this.setMode('auto');

				this.current.force_before_ms = null;
				this.current.force_after_ms = null;
				this.current.last_updated_ms = 0;
				this.follows_global = 0;
				this.paused = false;
				this.selected = false;
				this.enabled = true;
				this.debug = false;

				// do not update the chart here
				// or the chart will flip-flop when it is the master
				// of a selection sync and another chart becomes
				// the new master
				if(!NETDATA.options.current.sync_pan_and_zoom)
					state.updateChart();
			},

			setMode: function(m) {
				if(this.current) {
					if(this.current.name == m) return;

					this[m].url = this.current.url;
					this[m].last_updated_ms = this.current.last_updated_ms;
					this[m].view_update_every = this.current.view_update_every;
					this[m].after_ms = this.current.after_ms;
					this[m].before_ms = this.current.before_ms;
					this[m].points = this.current.points;
					this[m].data = this.current.data;
					this[m].requested_before_ms = this.current.requested_before_ms;
					this[m].requested_after_ms = this.current.requested_after_ms;
					this[m].first_entry_ms = this.current.first_entry_ms;
					this[m].last_entry_ms = this.current.last_entry_ms;
				}

				if(m == 'auto')
					this.current = this.auto;
				else if(m == 'pan')
					this.current = this.pan;
				else if(m == 'zoom')
					this.current = this.zoom;
				else
					this.current = this.auto;

				this.current.force_before_ms = null;
				this.current.force_after_ms = null;

				if(this.debug) this.log('mode set to ' + this.current.name);
			},

			_minPanOrZoomStep: function() {
				return (((this.current.before_ms - this.current.after_ms) / this.current.points) * ((this.current.points * 5 / 100) + 1) );
				// return this.current.view_update_every * 10;
			},

			_shouldBeMoved: function(old_after, old_before, new_after, new_before) {
				var dt_after = Math.abs(old_after - new_after);
				var dt_before = Math.abs(old_before - new_before);
				var old_range = old_before - old_after;

				var new_range = new_before - new_after;
				var dt = Math.abs(old_range - new_range);
				var step = Math.max(dt_after, dt_before, dt);

				var min_step = this._minPanOrZoomStep();
				if(new_range < old_range && new_range / this.chartWidth() < 100) {
					if(this.debug) this.log('_shouldBeMoved(' + (new_after / 1000).toString() + ' - ' + (new_before / 1000).toString() + '): minimum point size: 0.10, wanted point size: ' + (new_range / this.chartWidth() / 1000).toString() + ': TOO SMALL RANGE');
					return false;
				}

				if(step >= min_step) {
					if(this.debug) this.log('_shouldBeMoved(' + (new_after / 1000).toString() + ' - ' + (new_before / 1000).toString() + '): minimum step: ' + (min_step / 1000).toString() + ', this step: ' + (step / 1000).toString() + ': YES');
					return true;
				}
				else {
					if(this.debug) this.log('_shouldBeMoved(' + (new_after / 1000).toString() + ' - ' + (new_before / 1000).toString() + '): minimum step: ' + (min_step / 1000).toString() + ', this step: ' + (step / 1000).toString() + ': NO');
					return false;
				}
			},

			updateChartPanOrZoom: function(after, before, callback) {
				var move = false;

				if(this.current.name == 'auto') {
					if(this.debug) this.log('updateChartPanOrZoom(): caller did not set proper mode');
					this.setMode('pan');
				}
					
				if(!this.current.force_after_ms || !this.current.force_before_ms) {
					if(this.debug) this.log('updateChartPanOrZoom(' + (after / 1000).toString() + ' - ' + (before / 1000).toString() + '): INIT');
					move = true;
				}
				else if(this._shouldBeMoved(this.current.force_after_ms, this.current.force_before_ms, after, before) && this._shouldBeMoved(this.current.after_ms, this.current.before_ms, after, before)) {
					if(this.debug) this.log('updateChartPanOrZoom(' + (after / 1000).toString() + ' - ' + (before / 1000).toString() + '): FORCE CHANGE from ' + (this.current.force_after_ms / 1000).toString() + ' - ' + (this.current.force_before_ms / 1000).toString());
					move = true;
				}
				else if(this._shouldBeMoved(this.current.requested_after_ms, this.current.requested_before_ms, after, before) && this._shouldBeMoved(this.current.after_ms, this.current.before_ms, after, before)) {
					if(this.debug) this.log('updateChartPanOrZoom(' + (after / 1000).toString() + ' - ' + (before / 1000).toString() + '): REQUESTED CHANGE from ' + (this.current.requested_after_ms / 1000).toString() + ' - ' + (this.current.requested_before_ms / 1000).toString());
					move = true;
				}

				if(move) {
					var now = new Date().getTime();
					NETDATA.options.auto_refresher_stop_until = now + NETDATA.options.current.global_pan_sync_time;
					NETDATA.globalPanAndZoom.setMaster(this, after, before);

					this.current.force_after_ms = after;
					this.current.force_before_ms = before;
					this.updateChart(callback);
					return true;
				}

				if(this.debug) this.log('updateChartPanOrZoom(' + (after / 1000).toString() + ' - ' + (before / 1000).toString() + '): IGNORE');
				if(typeof callback != 'undefined') callback();
				return false;
			},

			createChartDOM: function() {
				this.element_chart_id = this.library_name + '-' + this.uuid + '-chart';
				var html = '<div class="netdata-chart netdata-'
					+ this.library_name + '-chart" id="'
					+ this.element_chart_id
					+ '"style="width: 100%; height: 100%;"></div>';
//					+ '"style="width: ' + this.chartWidth().toString() + 'px; height: ' + this.chartHeight().toString() + 'px;"></div>';

				if(this.hasLegend()) {
					this.element_legend_id = this.library_name + '-' + this.uuid + '-legend';
					html += '<div class="netdata-chart-legend netdata-'
						+ this.library_name + '-legend" id="'
						+ this.element_legend_id
						+ '" style="width: ' + this.legendWidth().toString() + 'px; height: ' + this.legendHeight() + 'px;"></div>';
				}

				element.innerHTML = html;
				this.element_chart = document.getElementById(this.element_chart_id);
				$(this.element_chart).data('netdata-state-object', this);

				if(this.hasLegend()) {
					this.element_legend = document.getElementById(this.element_legend_id);
					$(this.element_legend).data('netdata-state-object', this);
				}
			},

			hasLegend: function() {
				// return (this.library && this.library.legend == 'right-side');
				return false;
			},

			legendWidth: function() {
				return (this.hasLegend())?55:0;
			},

			legendHeight: function() {
				return $(this.element).height();
			},

			chartWidth: function() {
				return $(this.element).width() - this.legendWidth();
			},

			chartHeight: function() {
				return $(this.element).height();
			},

			chartPixelsPerPoint: function() {
				// force an options provided detail
				var px = this.pixels_per_point;

				if(this.library && px < this.library.pixels_per_point)
					px = this.library.pixels_per_point;

				if(px < NETDATA.options.current.pixels_per_point)
					px = NETDATA.options.current.pixels_per_point;

				return px;
			},

			needsResize: function() {
				return (this.last_resized < NETDATA.options.last_resized);
			},

			resizeChart: function() {
				if(this.needsResize()) {
					if(this.library && !this.library.autoresize) {
						if(this.debug) this.log('forcing re-generation due to window resize.');
						this.created_ms = 0;
						this.last_resized = new Date().getTime();
					}
				}
			},

			chartURL: function() {
				var before;
				var after;
				if(NETDATA.globalPanAndZoom.isActive()) {
					after = Math.round(NETDATA.globalPanAndZoom.force_after_ms / 1000);
					before = Math.round(NETDATA.globalPanAndZoom.force_before_ms / 1000);
					this.follows_global = NETDATA.globalPanAndZoom.seq;
				}
				else {
					before = this.current.force_before_ms != null ? Math.round(this.current.force_before_ms / 1000) : this.before;
					after  = this.current.force_after_ms  != null ? Math.round(this.current.force_after_ms / 1000) : this.after;
					this.follows_global = 0;
				}

				this.current.requested_after_ms = after * 1000;
				this.current.requested_before_ms = before * 1000;

				this.current.points = this.points || Math.round(this.chartWidth() / this.chartPixelsPerPoint());

				// build the data URL
				this.current.url = this.chart.data_url;
				this.current.url += "&format="  + this.library.format;
				this.current.url += "&points="  + this.current.points.toString();
				this.current.url += "&group="   + this.method;
				this.current.url += "&options=" + this.library.options;
				if(this.library.jsonWrapper) this.current.url += '|jsonwrap';

				if(after)
					this.current.url += "&after="  + after.toString();

				if(before)
					this.current.url += "&before=" + before.toString();

				if(this.dimensions)
					this.current.url += "&dimensions=" + this.dimensions;

				if(NETDATA.options.debug.chart_data_url || this.debug) this.log('chartURL(): ' + this.current.url + ' WxH:' + this.chartWidth() + 'x' + this.chartHeight() + ' points: ' + this.current.points + ' library: ' + this.library_name);
			},

			updateChartWithData: function(data) {
				if(this.debug) this.log('got data from netdata server');
				this.current.data = data;

				var started = new Date().getTime();

				// if the result is JSON, find the latest update-every
				if(typeof data == 'object' && this.library.jsonWrapper) {
					if(!this.follows_global && typeof data.view_update_every != 'undefined')
						this.current.view_update_every = data.view_update_every * 1000;

					if(typeof data.after != 'undefined')
						this.current.after_ms = data.after * 1000;

					if(typeof data.before != 'undefined')
						this.current.before_ms = data.before * 1000;

					if(typeof data.first_entry_t != 'undefined')
						this.current.first_entry_ms = data.first_entry_t * 1000;

					if(typeof data.last_entry_t != 'undefined')
						this.current.last_entry_ms = data.last_entry_t * 1000;

					if(typeof data.points != 'undefined')
						this.current.points = data.points;

					data.state = this;
				}

				this.updates_counter++;

				if(this.debug) {
					this.log('UPDATE No ' + this.updates_counter + ' COMPLETED');

					if(this.current.force_after_ms)
						this.log('STATUS: forced   : ' + (this.current.force_after_ms / 1000).toString() + ' - ' + (this.current.force_before_ms / 1000).toString());
					else
						this.log('STATUS: forced: unset');

					this.log('STATUS: requested: ' + (this.current.requested_after_ms / 1000).toString() + ' - ' + (this.current.requested_before_ms / 1000).toString());
					this.log('STATUS: rendered : ' + (this.current.after_ms / 1000).toString() + ' - ' + (this.current.before_ms / 1000).toString());
					this.log('STATUS: points   : ' + (this.current.points).toString() + ', min step: ' + (this._minPanOrZoomStep() / 1000).toString());
				}

				// this may force the chart to be re-created
				this.resizeChart();
				if(this.updates_since_last_creation >= this.library.max_updates_to_recreate) {
					if(this.debug) this.log('max updates of ' + this.updates_since_last_creation.toString() + ' reached. Forcing re-generation.');
					this.created_ms = 0;
				}

				if(this.created_ms && typeof this.library.update == 'function') {
					if(this.debug) this.log('updating chart...');

					this.updates_since_last_creation++;
					if(NETDATA.options.debug.chart_errors) {
						this.library.update(this, data);
					}
					else {
						try {
							this.library.update(this, data);
						}
						catch(err) {
							this.error('chart "' + this.id + '" failed to be updated as ' + this.library_name);
						}
					}
				}
				else {
					if(this.debug) this.log('creating chart...');

					this.createChartDOM();
					this.updates_since_last_creation = 0;

					if(NETDATA.options.debug.chart_errors) {
						this.library.create(this, data);
						this.created_ms = new Date().getTime();
					}
					else {
						try {
							this.library.create(this, data);
							this.created_ms = new Date().getTime();
						}
						catch(err) {
							this.error('chart "' + this.id + '" failed to be created as ' + this.library_name);
						}
					}
				}

				// update the performance counters
				this.current.last_updated_ms = new Date().getTime();
				this.refresh_dt_ms = this.current.last_updated_ms - started;
				NETDATA.options.auto_refresher_fast_weight += this.refresh_dt_ms;

				if(this.refresh_dt_element)
					this.refresh_dt_element.innerHTML = this.refresh_dt_ms.toString();
			},

			updateChart: function(callback) {
				if(!this.library || !this.library.enabled) {
					this.error('charting library "' + this.library_name + '" is not available');
					if(typeof callback != 'undefined') callback();
					return;
				}

				if(!this.enabled) {
					if(this.debug) this.error('chart "' + this.id + '" is not enabled');
					if(typeof callback != 'undefined') callback();
					return;
				}

				if(!this.isVisible()) {
					if(NETDATA.options.debug.visibility || this.debug) this.log('is not visible');
					if(typeof callback != 'undefined') callback();
					return;
				}
				if(!this.chart) {
					var this_state_object = this;
					this.getChart(function() { this_state_object.updateChart(callback); });
					return;
				}

				if(!this.library.initialized) {
					var this_state_object = this;
					this.library.initialize(function() { this_state_object.updateChart(callback); });
					return;
				}
				
				this.clearSelection();
				this.chartURL();
				if(this.debug) this.log('updating from ' + this.current.url);

				var this_state_object = this;
				$.ajax( {
					url: this.current.url,
					crossDomain: true
				})
				.then(function(data) {
					this_state_object.updateChartWithData(data);
				})
				.fail(function() {
					this_state_object.error('cannot download chart from ' + this_state_object.current.url);
				})
				.always(function() {
					if(typeof callback == 'function') callback();
				});
			},

			isVisible: function() {
				if(NETDATA.options.current.update_only_visible)
					return $(this.element).visible(true);
				else
					return true;
			},

			isAutoRefreshed: function() {
				return this.current.autorefresh;
			},

			canBeAutoRefreshed: function() {
				if(this.isAutoRefreshed()) {
					var now = new Date().getTime();

					if(this.updates_counter && !NETDATA.options.page_is_visible) {
						if(NETDATA.options.debug.focus || this.debug) this.log('canBeAutoRefreshed(): page does not have focus');
						return false;
					}

					if(!this.isVisible()) {
						if(this.debug) this.log('canBeAutoRefreshed(): I am not visible.');
						return false;
					}

					// options valid only for autoRefresh()
					if(NETDATA.options.auto_refresher_stop_until == 0 || NETDATA.options.auto_refresher_stop_until < now) {
						if(NETDATA.globalPanAndZoom.isActive()) {
							if(NETDATA.globalPanAndZoom.shouldBeAutoRefreshed(this)) {
								if(this.debug) this.log('canBeAutoRefreshed(): global panning: I need an update.');
								return true;
							}
							else {
								if(this.debug) this.log('canBeAutoRefreshed(): global panning: I am already up to date.');
								return false;
							}
						}

						if(this.selected) {
							if(this.debug) this.log('canBeAutoRefreshed(): I have a selection in place.');
							return false;
						}

						if(this.paused) {
							if(this.debug) this.log('canBeAutoRefreshed(): I am paused.');
							return false;
						}

						if(now - this.current.last_updated_ms > this.current.view_update_every) {
							if(this.debug) this.log('canBeAutoRefreshed(): It is time to update me.');
							return true;
						}
					}
				}

				return false;
			},

			autoRefresh: function(callback) {
				if(this.canBeAutoRefreshed()) {
					this.updateChart(callback);
				}
				else {
					if(typeof callback != 'undefined')
						callback();
				}
			},

			_defaultsFromDownloadedChart: function(chart) {
				this.chart = chart;
				this.chart_url = chart.url;
				this.current.view_update_every = chart.update_every * 1000;
				this.current.points = Math.round(this.chartWidth() / this.chartPixelsPerPoint());
			},

			// fetch the chart description from the netdata server
			getChart: function(callback) {
				this.chart = NETDATA.chartRegistry.get(this.host, this.id);
				if(this.chart) {
					this._defaultsFromDownloadedChart(this.chart);
					if(typeof callback == 'function') callback();
				}
				else {
					this.chart_url = this.host + "/api/v1/chart?chart=" + this.id;
					if(this.debug) this.log('downloading ' + this.chart_url);
					var this_state_object = this;

					$.ajax( {
						url:  this.chart_url,
						crossDomain: true
					})
					.done(function(chart) {
						chart.url = this_state_object.chart_url;
						chart.data_url = (this_state_object.host + chart.data_url);
						this_state_object._defaultsFromDownloadedChart(chart);
						NETDATA.chartRegistry.add(this_state_object.host, this_state_object.id, chart);
					})
					.fail(function() {
						NETDATA.error(404, this_state_object.chart_url);
						this_state_object.error('chart "' + this_state_object.id + '" not found on url "' + this_state_object.chart_url + '"');
					})
					.always(function() {
						if(typeof callback == 'function') callback();
					});
				}
			},

			// resize the chart to its real dimensions
			// as given by the caller
			sizeChart: function() {
				element.className += "netdata-container";

				if(this.debug) this.log('sizing element');

				if(this.width)
					$(this.element).css('width', this.width);

				if(this.height)
					$(this.element).css('height', this.height);

				// these should be left to css
				//$(this.element).css('display', 'inline-block')
				//$(this.element).css('overflow', 'hidden');

				if(NETDATA.chartDefaults.min_width)
					$(this.element).css('min-width', NETDATA.chartDefaults.min_width);
			},

			// show a message in the chart
			message: function(type, msg) {
				this.element.innerHTML = '<div class="netdata-message netdata-' + type + '-message" style="font-size: x-small; overflow: hidden; width: 100%; height: 100%;"><small>'
					+ msg
					+ '</small></div>';
				
				// reset the creation datetime
				// since we overwrote the whole element
				this.created_ms = 0
				if(this.debug) this.log(msg);
			},

			// show an error on the chart and stop it forever
			error: function(msg) {
				this.message('error', this.id + ': ' + msg);
				this.enabled = false;
			},

			// show a message indicating the chart is loading
			info: function(msg) {
				this.message('info', this.id + ': ' + msg);
			},

			init: function() {
				if(this.debug) this.log('created');
				this.sizeChart();
				this.info("loading...");

				// make sure the host does not end with /
				// all netdata API requests use absolute paths
				while(this.host.slice(-1) == '/')
					this.host = this.host.substring(0, this.host.length - 1);

				// check the requested library is available
				// we don't initialize it here - it will be initialized when
				// this chart will be first used
				if(typeof NETDATA.chartLibraries[this.library_name] == 'undefined') {
					NETDATA.error(402, this.library_name);
					this.error('chart library "' + this.library_name + '" is not found');
				}
				else if(!NETDATA.chartLibraries[this.library_name].enabled) {
					NETDATA.error(403, this.library_name);
					this.error('chart library "' + this.library_name + '" is not enabled');
				}
				else
					this.library = NETDATA.chartLibraries[this.library_name];

				// if we need to report the rendering speed
				// find the element that needs to be updated
				if(this.refresh_dt_element_name)
					this.refresh_dt_element = document.getElementById(this.refresh_dt_element_name) || null;

				// the default mode for all charts
				this.setMode('auto');
			}
		};

		state.init();
		return state;
	}

	// get or create a chart state, given a DOM element
	NETDATA.chartState = function(element) {
		var state = $(element).data('netdata-state-object') || null;
		if(!state) {
			state = NETDATA.chartInitialState(element);
			$(element).data('netdata-state-object', state);
		}
		return state;
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Library functions

	// Load a script without jquery
	// This is used to load jquery - after it is loaded, we use jquery
	NETDATA._loadjQuery = function(callback) {
		if(typeof jQuery == 'undefined') {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = true;
			script.src = NETDATA.jQuery;

			// script.onabort = onError;
			script.onerror = function(err, t) { NETDATA.error(101, NETDATA.jQuery); };
			if(typeof callback == "function")
				script.onload = callback;

			var s = document.getElementsByTagName('script')[0];
			s.parentNode.insertBefore(script, s);
		}
		else if(typeof callback == "function")
			callback();
	}

	NETDATA._loadCSS = function(filename) {
		var fileref = document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text/css");
		fileref.setAttribute("href", filename);

		if (typeof fileref != "undefined")
			document.getElementsByTagName("head")[0].appendChild(fileref);
	}

	NETDATA.ColorLuminance = function(hex, lum) {
		// validate hex string
		hex = String(hex).replace(/[^0-9a-f]/gi, '');
		if (hex.length < 6)
			hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];

		lum = lum || 0;

		// convert to decimal and change luminosity
		var rgb = "#", c, i;
		for (i = 0; i < 3; i++) {
			c = parseInt(hex.substr(i*2,2), 16);
			c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
			rgb += ("00"+c).substr(c.length);
		}

		return rgb;
	}

	NETDATA.guid = function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1);
			}

			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	// user function to signal us the DOM has been
	// updated.
	NETDATA.updatedDom = function() {
		NETDATA.options.updated_dom = true;
	}

	// ----------------------------------------------------------------------------------------------------------------

	NETDATA.chartRefresher = function(index) {
		// if(NETDATA.options.debug.mail_loop) console.log('NETDATA.chartRefresher(<targets, ' + index + ')');

		if(NETDATA.options.updated_dom) {
			// the dom has been updated
			// get the dom parts again
			NETDATA.getDomCharts(function() {
				NETDATA.chartRefresher(0);
			});

			return;
		}
		var target = NETDATA.options.targets.get(index);
		if(target == null) {
			if(NETDATA.options.debug.main_loop) console.log('waiting to restart main loop...');
				NETDATA.options.auto_refresher_fast_weight = 0;

				setTimeout(function() {
					NETDATA.chartRefresher(0);
				}, NETDATA.options.current.idle_between_loops);
			}
		else {
			var state = NETDATA.chartState(target);

			if(NETDATA.options.auto_refresher_fast_weight < NETDATA.options.current.fast_render_timeframe) {
				if(NETDATA.options.debug.main_loop) console.log('fast rendering...');

				state.autoRefresh(function() {
					NETDATA.chartRefresher(++index);
				}, false);
			}
			else {
				if(NETDATA.options.debug.main_loop) console.log('waiting for next refresh...');
				NETDATA.options.auto_refresher_fast_weight = 0;

				setTimeout(function() {
					state.autoRefresh(function() {
						NETDATA.chartRefresher(++index);
					}, false);
				}, NETDATA.options.current.idle_between_charts);
			}
		}
	}

	NETDATA.getDomCharts = function(callback) {
		NETDATA.options.updated_dom = false;

		NETDATA.options.targets = $('div[data-netdata]').filter(':visible');

		if(NETDATA.options.debug.main_loop)
			console.log('DOM updated - there are ' + NETDATA.options.targets.length + ' charts on page.');

		// we need to re-size all the charts quickly
		// before making any external calls
		$.each(NETDATA.options.targets, function(i, target) {
			// the initialization will take care of sizing
			// and the "loading..." message
			var state = NETDATA.chartState(target);
		});

		if(typeof callback == 'function') callback();
	}

	// this is the main function - where everything starts
	NETDATA.start = function() {
		// this should be called only once

		NETDATA.options.page_is_visible = true;

		$(window).blur(function() {
			NETDATA.options.page_is_visible = false;
			if(NETDATA.options.debug.focus) console.log('Lost Focus!');
		});

		$(window).focus(function() {
			NETDATA.options.page_is_visible = true;
			if(NETDATA.options.debug.focus) console.log('Focus restored!');
		});

		if(typeof document.hasFocus == 'function' && !document.hasFocus()) {
			NETDATA.options.page_is_visible = false;
			if(NETDATA.options.debug.focus) console.log('Document has no focus!');
		}

		NETDATA.getDomCharts(function() {
			NETDATA.chartRefresher(0);
		});
	}

	// ----------------------------------------------------------------------------------------------------------------
	// peity

	NETDATA.peityInitialize = function(callback) {
		if(typeof netdataNoPeitys == 'undefined' || !netdataNoPeitys) {
			$.getScript(NETDATA.peity_js)
				.done(function() {
					NETDATA.registerChartLibrary('peity', NETDATA.peity_js);
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.peity_js);
				})
				.always(function() {
					if(typeof callback == "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.peity.enabled = false;
			if(typeof callback == "function")
				callback();
		}
	};

	NETDATA.peityChartUpdate = function(state, data) {
		$(state.element_chart).html(data.result);
		// $(state.element_chart).change() does not accept options
		// to pass width and height
		//$(state.element_chart).change();
		$(state.element_chart).peity('line', { width: state.chartWidth(), height: state.chartHeight() });
	}

	NETDATA.peityChartCreate = function(state, data) {
		$(state.element_chart).html(data.result);
		$(state.element_chart).peity('line', { width: state.chartWidth(), height: state.chartHeight() });
	}

	// ----------------------------------------------------------------------------------------------------------------
	// sparkline

	NETDATA.sparklineInitialize = function(callback) {
		if(typeof netdataNoSparklines == 'undefined' || !netdataNoSparklines) {
			$.getScript(NETDATA.sparkline_js)
				.done(function() {
					NETDATA.registerChartLibrary('sparkline', NETDATA.sparkline_js);
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.sparkline_js);
				})
				.always(function() {
					if(typeof callback == "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.sparkline.enabled = false;
			if(typeof callback == "function") 
				callback();
		}
	};

	NETDATA.sparklineChartUpdate = function(state, data) {
		state.sparkline_options.width = state.chartWidth();
		state.sparkline_options.height = state.chartHeight();

		$(state.element_chart).sparkline(data.result, state.sparkline_options);
	}

	NETDATA.sparklineChartCreate = function(state, data) {
		var self = $(state.element);
		var type = self.data('sparkline-type') || 'line';
		var lineColor = self.data('sparkline-linecolor') || NETDATA.colors[0];
		var fillColor = self.data('sparkline-fillcolor') || (state.chart.chart_type == 'line')?'#FFF':NETDATA.ColorLuminance(lineColor, NETDATA.chartDefaults.fill_luminance);
		var chartRangeMin = self.data('sparkline-chartrangemin') || undefined;
		var chartRangeMax = self.data('sparkline-chartrangemax') || undefined;
		var composite = self.data('sparkline-composite') || undefined;
		var enableTagOptions = self.data('sparkline-enabletagoptions') || undefined;
		var tagOptionPrefix = self.data('sparkline-tagoptionprefix') || undefined;
		var tagValuesAttribute = self.data('sparkline-tagvaluesattribute') || undefined;
		var disableHiddenCheck = self.data('sparkline-disablehiddencheck') || undefined;
		var defaultPixelsPerValue = self.data('sparkline-defaultpixelspervalue') || undefined;
		var spotColor = self.data('sparkline-spotcolor') || undefined;
		var minSpotColor = self.data('sparkline-minspotcolor') || undefined;
		var maxSpotColor = self.data('sparkline-maxspotcolor') || undefined;
		var spotRadius = self.data('sparkline-spotradius') || undefined;
		var valueSpots = self.data('sparkline-valuespots') || undefined;
		var highlightSpotColor = self.data('sparkline-highlightspotcolor') || undefined;
		var highlightLineColor = self.data('sparkline-highlightlinecolor') || undefined;
		var lineWidth = self.data('sparkline-linewidth') || undefined;
		var normalRangeMin = self.data('sparkline-normalrangemin') || undefined;
		var normalRangeMax = self.data('sparkline-normalrangemax') || undefined;
		var drawNormalOnTop = self.data('sparkline-drawnormalontop') || undefined;
		var xvalues = self.data('sparkline-xvalues') || undefined;
		var chartRangeClip = self.data('sparkline-chartrangeclip') || undefined;
		var xvalues = self.data('sparkline-xvalues') || undefined;
		var chartRangeMinX = self.data('sparkline-chartrangeminx') || undefined;
		var chartRangeMaxX = self.data('sparkline-chartrangemaxx') || undefined;
		var disableInteraction = self.data('sparkline-disableinteraction') || false;
		var disableTooltips = self.data('sparkline-disabletooltips') || false;
		var disableHighlight = self.data('sparkline-disablehighlight') || false;
		var highlightLighten = self.data('sparkline-highlightlighten') || 1.4;
		var highlightColor = self.data('sparkline-highlightcolor') || undefined;
		var tooltipContainer = self.data('sparkline-tooltipcontainer') || undefined;
		var tooltipClassname = self.data('sparkline-tooltipclassname') || undefined;
		var tooltipFormat = self.data('sparkline-tooltipformat') || undefined;
		var tooltipPrefix = self.data('sparkline-tooltipprefix') || undefined;
		var tooltipSuffix = self.data('sparkline-tooltipsuffix') || ' ' + state.chart.units;
		var tooltipSkipNull = self.data('sparkline-tooltipskipnull') || true;
		var tooltipValueLookups = self.data('sparkline-tooltipvaluelookups') || undefined;
		var tooltipFormatFieldlist = self.data('sparkline-tooltipformatfieldlist') || undefined;
		var tooltipFormatFieldlistKey = self.data('sparkline-tooltipformatfieldlistkey') || undefined;
		var numberFormatter = self.data('sparkline-numberformatter') || function(n){ return n.toFixed(2); };
		var numberDigitGroupSep = self.data('sparkline-numberdigitgroupsep') || undefined;
		var numberDecimalMark = self.data('sparkline-numberdecimalmark') || undefined;
		var numberDigitGroupCount = self.data('sparkline-numberdigitgroupcount') || undefined;
		var animatedZooms = self.data('sparkline-animatedzooms') || false;

		state.sparkline_options = {
			type: type,
			lineColor: lineColor,
			fillColor: fillColor,
			chartRangeMin: chartRangeMin,
			chartRangeMax: chartRangeMax,
			composite: composite,
			enableTagOptions: enableTagOptions,
			tagOptionPrefix: tagOptionPrefix,
			tagValuesAttribute: tagValuesAttribute,
			disableHiddenCheck: disableHiddenCheck,
			defaultPixelsPerValue: defaultPixelsPerValue,
			spotColor: spotColor,
			minSpotColor: minSpotColor,
			maxSpotColor: maxSpotColor,
			spotRadius: spotRadius,
			valueSpots: valueSpots,
			highlightSpotColor: highlightSpotColor,
			highlightLineColor: highlightLineColor,
			lineWidth: lineWidth,
			normalRangeMin: normalRangeMin,
			normalRangeMax: normalRangeMax,
			drawNormalOnTop: drawNormalOnTop,
			xvalues: xvalues,
			chartRangeClip: chartRangeClip,
			chartRangeMinX: chartRangeMinX,
			chartRangeMaxX: chartRangeMaxX,
			disableInteraction: disableInteraction,
			disableTooltips: disableTooltips,
			disableHighlight: disableHighlight,
			highlightLighten: highlightLighten,
			highlightColor: highlightColor,
			tooltipContainer: tooltipContainer,
			tooltipClassname: tooltipClassname,
			tooltipChartTitle: state.chart.title,
			tooltipFormat: tooltipFormat,
			tooltipPrefix: tooltipPrefix,
			tooltipSuffix: tooltipSuffix,
			tooltipSkipNull: tooltipSkipNull,
			tooltipValueLookups: tooltipValueLookups,
			tooltipFormatFieldlist: tooltipFormatFieldlist,
			tooltipFormatFieldlistKey: tooltipFormatFieldlistKey,
			numberFormatter: numberFormatter,
			numberDigitGroupSep: numberDigitGroupSep,
			numberDecimalMark: numberDecimalMark,
			numberDigitGroupCount: numberDigitGroupCount,
			animatedZooms: animatedZooms,
			width: state.chartWidth(),
			height: state.chartHeight()
		};

		$(state.element_chart).sparkline(data.result, state.sparkline_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// dygraph

	NETDATA.dygraph = {
		state: null,
		sync: false,
		dont_sync_before: 0,
		slaves: []
	};

	NETDATA.dygraph.syncStart = function(state, event, x, points, row, seriesName) {
		if(!NETDATA.options.current.sync_selection) return;
		if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraph.syncStart()');

		//if(NETDATA.dygraph.state && NETDATA.dygraph.state != state) {
		//	state.log('sync: I am not the sync master.');
		//	return;
		//}
		// state.debug = true;

		var t = state.current.after_ms + row * state.current.view_update_every;
		// console.log('row = ' + row + ', x = ' + x + ', t = ' + t + ' ' + ((t == x)?'SAME':'DIFFERENT'));

		now = new Date().getTime();
		if(now < NETDATA.dygraph.dont_sync_before) {
			if(state.debug) state.log('sync: cannot sync yet.');
			return;
		}

		// since we are the sync master, we should not call state.setSelection()
		// dygraphs is taking care of visualizing our selection.
		state.selected = true;

		var dygraph = state.dygraph_instance;

		if(!NETDATA.dygraph.sync) {
			if(state.debug) state.log('sync: setting up...');
			$.each(NETDATA.options.targets, function(i, target) {
				var st = NETDATA.chartState(target);
				if(st == state) {
					if(state.debug) st.log('sync: not adding me to sync');
				}
				else {
					if(typeof st.dygraph_instance == 'object' && st.library_name == state.library_name && st.isVisible()) {
						NETDATA.dygraph.slaves.push(st);
						if(state.debug) st.log('sync: added slave to sync');
					}
				}
			});
			NETDATA.dygraph.sync = true;
		}

		$.each(NETDATA.dygraph.slaves, function(i, st) {
			if(st == state) {
				if(state.debug) st.log('sync: ignoring me from set selection');
			}
			else {
				if(state.debug) st.log('sync: showing master selection');
				st.setSelection(t);
			}
		});
	}

	NETDATA.dygraph.syncStop = function(state) {
		if(!NETDATA.options.current.sync_selection) return;

		if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraph.syncStop()');

		//if(NETDATA.dygraph.state && NETDATA.dygraph.state != state) {
		//	state.log('sync: I am not the sync master.');
		//	return;
		//}

		if(NETDATA.dygraph.sync) {
			if(state.debug) st.log('sync: cleaning up...');
			$.each(NETDATA.dygraph.slaves, function(i, st) {
				if(st == state) {
					if(state.debug) st.log('sync: not adding me to sync stop');
				}
				else {
					if(state.debug) st.log('sync: removed slave from sync');
					st.clearSelection();
				}
			});

			NETDATA.dygraph.slaves = [];
			NETDATA.dygraph.sync = false;
		}

		// since we are the sync master, we should not call state.clearSelection()
		// dygraphs is taking care of visualizing our selection.
		state.selected = false;
	}

	NETDATA.dygraph.resetChart = function(state, dygraph, context) {
		if(NETDATA.options.debug.dygraph) state.log('dygraph.resetChart()');

		state.resetChart();
		if(NETDATA.globalPanAndZoom.clearMaster());
	}

	NETDATA.dygraph.chartPanOrZoom = function(state, dygraph, after, before) {
		if(NETDATA.options.debug.dygraph) console.log('>>>> dygraph.zoomOrPan(state, dygraph, after:' + after + ', before: ' + before + ')');

		state.updateChartPanOrZoom(after, before);
		return;
	}

	NETDATA.dygraphSetSelection = function(state, t) {
		if(typeof state.dygraph_instance != 'undefined') {
			var r = state.calculateRowForTime(t);
			if(r != -1) {
				state.dygraph_instance.setSelection(r);
				return true;
			}
			else {
				state.dygraph_instance.clearSelection();
				return false;
			}
		}
	}

	NETDATA.dygraphClearSelection = function(state, t) {
		if(typeof state.dygraph_instance != 'undefined') {
			state.dygraph_instance.clearSelection();
		}
		return true;
	}

	NETDATA.dygraphInitialize = function(callback) {
		if(typeof netdataNoDygraphs == 'undefined' || !netdataNoDygraphs) {
			$.getScript(NETDATA.dygraph_js)
				.done(function() {
					NETDATA.registerChartLibrary('dygraph', NETDATA.dygraph_js);
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.dygraph_js);
				})
				.always(function() {
					if(typeof callback == "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.dygraph.enabled = false;
			if(typeof callback == "function")
				callback();
		}
	};

	NETDATA.dygraphChartUpdate = function(state, data) {
		var dygraph = state.dygraph_instance;

		if(state.current.name == 'pan') {
			if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraphChartUpdate() loose update');
			dygraph.updateOptions({
				file: data.result.data,
				labels: data.result.labels,
				labelsDivWidth: state.chartWidth() - 70
			});
		}
		else {
			if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraphChartUpdate() strict update');
			dygraph.updateOptions({
				file: data.result.data,
				labels: data.result.labels,
				labelsDivWidth: state.chartWidth() - 70,
				dateWindow: null,
    			valueRange: null
			});
		}
	};

	NETDATA.dygraphChartCreate = function(state, data) {
		if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraphChartCreate()');

		var self = $(state.element);
		var title = self.data('dygraph-title') || state.chart.title;
		var titleHeight = self.data('dygraph-titleheight') || 19;
		var labelsDiv = self.data('dygraph-labelsdiv') || undefined;
		var connectSeparatedPoints = self.data('dygraph-connectseparatedpoints') || false;
		var yLabelWidth = self.data('dygraph-ylabelwidth') || 12;
		var stackedGraph = self.data('dygraph-stackedgraph') || (state.chart.chart_type == 'stacked')?true:false;
		var stackedGraphNaNFill = self.data('dygraph-stackedgraphnanfill') || 'none';
		var hideOverlayOnMouseOut = self.data('dygraph-hideoverlayonmouseout') || true;
		var fillGraph = self.data('dygraph-fillgraph') || (state.chart.chart_type == 'area')?true:false;
		var drawPoints = self.data('dygraph-drawpoints') || false;
		var labelsDivStyles = self.data('dygraph-labelsdivstyles') || { 'fontSize':'10px' };
		var labelsDivWidth = self.data('dygraph-labelsdivwidth') || state.chartWidth() - 70;
		var labelsSeparateLines = self.data('dygraph-labelsseparatelines') || false;
		var labelsShowZeroValues = self.data('dygraph-labelsshowzerovalues') || true;
		var legend = self.data('dygraph-legend') || 'onmouseover';
		var showLabelsOnHighlight = self.data('dygraph-showlabelsonhighlight') || true;
		var gridLineColor = self.data('dygraph-gridlinecolor') || '#EEE';
		var axisLineColor = self.data('dygraph-axislinecolor') || '#EEE';
		var maxNumberWidth = self.data('dygraph-maxnumberwidth') || 8;
		var sigFigs = self.data('dygraph-sigfigs') || null;
		var digitsAfterDecimal = self.data('dygraph-digitsafterdecimal') || 2;
		var axisLabelFontSize = self.data('dygraph-axislabelfontsize') || 10;
		var axisLineWidth = self.data('dygraph-axislinewidth') || 0.3;
		var drawAxis = self.data('dygraph-drawaxis') || true;
		var strokeWidth = self.data('dygraph-strokewidth') || 1.0;
		var drawGapEdgePoints = self.data('dygraph-drawgapedgepoints') || true;
		var colors = self.data('dygraph-colors') || NETDATA.colors;
		var pointSize = self.data('dygraph-pointsize') || 1;
		var stepPlot = self.data('dygraph-stepplot') || false;
		var strokeBorderColor = self.data('dygraph-strokebordercolor') || 'white';
		var strokeBorderWidth = self.data('dygraph-strokeborderwidth') || (state.chart.chart_type == 'stacked')?0.1:0.0;
		var strokePattern = self.data('dygraph-strokepattern') || undefined;
		var highlightCircleSize = self.data('dygraph-highlightcirclesize') || 3;
		var highlightSeriesOpts = self.data('dygraph-highlightseriesopts') || null; // TOO SLOW: { strokeWidth: 1.5 };
		var highlightSeriesBackgroundAlpha = self.data('dygraph-highlightseriesbackgroundalpha') || null; // TOO SLOW: (state.chart.chart_type == 'stacked')?0.7:0.5;
		var pointClickCallback = self.data('dygraph-pointclickcallback') || undefined;
		var showRangeSelector = self.data('dygraph-showrangeselector') || false;
		var showRoller = self.data('dygraph-showroller') || false;
		var valueFormatter = self.data('dygraph-valueformatter') || undefined; //function(x){ return x.toFixed(2); };
		var rightGap = self.data('dygraph-rightgap') || 5;
		var drawGrid = self.data('dygraph-drawgrid') || true;
		var drawXGrid = self.data('dygraph-drawxgrid') || undefined;
		var drawYGrid = self.data('dygraph-drawygrid') || undefined;
		var gridLinePattern = self.data('dygraph-gridlinepattern') || null;
		var gridLineWidth = self.data('dygraph-gridlinewidth') || 0.3;

		state.dygraph_options = {
			title: title,
			titleHeight: titleHeight,
			ylabel: state.chart.units,
			yLabelWidth: yLabelWidth,
			connectSeparatedPoints: connectSeparatedPoints,
			drawPoints: drawPoints,
			fillGraph: fillGraph,
			stackedGraph: stackedGraph,
			stackedGraphNaNFill: stackedGraphNaNFill,
			drawGrid: drawGrid,
			drawXGrid: drawXGrid,
			drawYGrid: drawYGrid,
			gridLinePattern: gridLinePattern,
			gridLineWidth: gridLineWidth,
			gridLineColor: gridLineColor,
			axisLineColor: axisLineColor,
			axisLineWidth: axisLineWidth,
			drawAxis: drawAxis,
			hideOverlayOnMouseOut: hideOverlayOnMouseOut,
			labelsDiv: labelsDiv,
			labelsDivStyles: labelsDivStyles,
			labelsDivWidth: labelsDivWidth,
			labelsSeparateLines: labelsSeparateLines,
			labelsShowZeroValues: labelsShowZeroValues,
			labelsKMB: false,
			labelsKMG2: false,
			legend: legend,
			showLabelsOnHighlight: showLabelsOnHighlight,
			maxNumberWidth: maxNumberWidth,
			sigFigs: sigFigs,
			digitsAfterDecimal: digitsAfterDecimal,
			axisLabelFontSize: axisLabelFontSize,
			colors: colors,
			strokeWidth: strokeWidth,
			drawGapEdgePoints: drawGapEdgePoints,
			pointSize: pointSize,
			stepPlot: stepPlot,
			strokeBorderColor: strokeBorderColor,
			strokeBorderWidth: strokeBorderWidth,
			strokePattern: strokePattern,
			highlightCircleSize: highlightCircleSize,
			highlightSeriesOpts: highlightSeriesOpts,
			highlightSeriesBackgroundAlpha: highlightSeriesBackgroundAlpha,
			pointClickCallback: pointClickCallback,
			showRangeSelector: showRangeSelector,
			showRoller: showRoller,
			valueFormatter: valueFormatter,
			rightGap: rightGap,
			labels: data.result.labels,
			axes: {
				x: {
					pixelsPerLabel: 50,
					ticker: Dygraph.dateTicker,
					axisLabelFormatter: function (d, gran) {
						return Dygraph.zeropad(d.getHours()) + ":" + Dygraph.zeropad(d.getMinutes()) + ":" + Dygraph.zeropad(d.getSeconds());
					},
					valueFormatter :function (ms) {
						var d = new Date(ms);
						return Dygraph.zeropad(d.getHours()) + ":" + Dygraph.zeropad(d.getMinutes()) + ":" + Dygraph.zeropad(d.getSeconds());
					}
				},
				y: {
					pixelsPerLabel: 15
				}
			},
			drawCallback: function(dygraph, is_initial) {
				if(state.current.name != 'auto') {
					if(NETDATA.options.debug.dygraph) state.log('dygraphDrawCallback()');

					var x_range = dygraph.xAxisRange();
					var after = Math.round(x_range[0]);
					var before = Math.round(x_range[1]);

					NETDATA.dygraph.chartPanOrZoom(state, this, after, before);
				}
			},
			zoomCallback: function(minDate, maxDate, yRanges) {
				if(NETDATA.options.debug.dygraph) state.log('dygraphZoomCallback()');
				NETDATA.dygraph.syncStop(state);
				NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
				NETDATA.dygraph.chartPanOrZoom(state, this, minDate, maxDate);
			},
			highlightCallback: function(event, x, points, row, seriesName) {
				if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraphHighlightCallback()');
				state.pauseChart();
				NETDATA.dygraph.syncStart(state, event, x, points, row, seriesName);
			},
			unhighlightCallback: function(event) {
				if(NETDATA.options.debug.dygraph || state.debug) state.log('dygraphUnhighlightCallback()');
				state.unpauseChart();
				NETDATA.dygraph.syncStop(state);
			},
			interactionModel : {
				mousedown: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.mousedown()');
					NETDATA.dygraph.syncStop(state);

					if(NETDATA.options.debug.dygraph) state.log('dygraphMouseDown()');

					// Right-click should not initiate a zoom.
					if(event.button && event.button == 2) return;

					context.initializeMouseDown(event, dygraph, context);
					
					if(event.button && event.button == 1) {
						if (event.altKey || event.shiftKey) {
							state.setMode('pan');
							NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
							Dygraph.startPan(event, dygraph, context);
						}
						else {
							state.setMode('zoom');
							NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
							Dygraph.startZoom(event, dygraph, context);
						}
					}
					else {
						if (event.altKey || event.shiftKey) {
							state.setMode('zoom');
							NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
							Dygraph.startZoom(event, dygraph, context);
						}
						else {
							state.setMode('pan');
							NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
							Dygraph.startPan(event, dygraph, context);
						}
					}
				},
				mousemove: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.mousemove()');

					if(context.isPanning) {
						NETDATA.dygraph.syncStop(state);
						NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
						state.setMode('pan');
						Dygraph.movePan(event, dygraph, context);
					}
					else if(context.isZooming) {
						NETDATA.dygraph.syncStop(state);
						NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
						state.setMode('zoom');
						Dygraph.moveZoom(event, dygraph, context);
					}
				},
				mouseup: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.mouseup()');

					if (context.isPanning) {
						NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
						Dygraph.endPan(event, dygraph, context);
					}
					else if (context.isZooming) {
						NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
						Dygraph.endZoom(event, dygraph, context);
					}
				},
				click: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.click()');
					Dygraph.cancelEvent(event);
				},
				dblclick: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.dblclick()');
					NETDATA.dygraph.syncStop(state);
					NETDATA.dygraph.resetChart(state, dygraph, context);
				},
				mousewheel: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.mousewheel()');

					NETDATA.dygraph.syncStop(state);
					NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;

					if(event.altKey || event.shiftKey) {
						// http://dygraphs.com/gallery/interaction-api.js
						var normal = (event.detail) ? event.detail * -1 : event.wheelDelta / 40;
						var percentage = normal / 25;

						var before_old = state.current.before_ms;
						var after_old = state.current.after_ms;
						var range_old = before_old - after_old;

						var range = range_old * ( 1 - percentage );
						var dt = Math.round((range_old - range) / 2);

						var before = before_old - dt;
						var after  = after_old  + dt;

						if(NETDATA.options.debug.dygraph) state.log('percent: ' + percentage + ' from ' + after_old + ' - ' + before_old + ' to ' + after + ' - ' + before + ', range from ' + (before_old - after_old).toString() + ' to ' + (before - after).toString());

						state.setMode('zoom');
						NETDATA.dygraph.chartPanOrZoom(state, dygraph, after, before);
					}					
				},
				touchstart: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.touchstart()');
					NETDATA.dygraph.syncStop(state);
					NETDATA.dygraph.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
					Dygraph.Interaction.startTouch(event, dygraph, context);
					context.touchDirections = { x: true, y: false };
					state.setMode('zoom');
				},
				touchmove: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.touchmove()');
					//Dygraph.cancelEvent(event);
					NETDATA.dygraph.syncStop(state);
					Dygraph.Interaction.moveTouch(event, dygraph, context);
				},
				touchend: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph || state.debug) state.log('interactionModel.touchend()');
					Dygraph.Interaction.endTouch(event, dygraph, context);
				}
			}
		};

		state.dygraph_instance = new Dygraph(state.element_chart,
			data.result.data, state.dygraph_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// morris

	NETDATA.morrisInitialize = function(callback) {
		if(typeof netdataNoMorris == 'undefined' || !netdataNoMorris) {

			// morris requires raphael
			if(!NETDATA.chartLibraries.raphael.initialized) {
				if(NETDATA.chartLibraries.raphael.enabled) {
					NETDATA.raphaelInitialize(function() {
						NETDATA.morrisInitialize(callback);
					});
				}
				else {
					NETDATA.chartLibraries.morris.enabled = false;
					if(typeof callback == "function")
						callback();
				}
			}
			else {
				NETDATA._loadCSS(NETDATA.morris_css);

				$.getScript(NETDATA.morris_js)
					.done(function() {
						NETDATA.registerChartLibrary('morris', NETDATA.morris_js);
					})
					.fail(function() {
						NETDATA.error(100, NETDATA.morris_js);
					})
					.always(function() {
						if(typeof callback == "function")
							callback();
					})
			}
		}
		else {
			NETDATA.chartLibraries.morris.enabled = false;
			if(typeof callback == "function")
				callback();
		}
	};

	NETDATA.morrisChartUpdate = function(state, data) {
		state.morris_instance.setData(data.result.data);
	};

	NETDATA.morrisChartCreate = function(state, data) {

		state.morris_options = {
				element: state.element_chart_id,
				data: data.result.data,
				xkey: 'time',
				ykeys: data.dimension_names,
				labels: data.dimension_names,
				lineWidth: 2,
				pointSize: 3,
				smooth: true,
				hideHover: 'auto',
				parseTime: true,
				continuousLine: false,
				behaveLikeLine: false
		};

		if(state.chart.chart_type == 'line')
			state.morris_instance = new Morris.Line(state.morris_options);

		else if(state.chart.chart_type == 'area') {
			state.morris_options.behaveLikeLine = true;
			state.morris_instance = new Morris.Area(state.morris_options);
		}
		else // stacked
			state.morris_instance = new Morris.Area(state.morris_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// raphael

	NETDATA.raphaelInitialize = function(callback) {
		if(typeof netdataStopRaphael == 'undefined') {
			$.getScript(NETDATA.raphael_js)
				.done(function() {
					NETDATA.registerChartLibrary('raphael', NETDATA.raphael_js);
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.raphael_js);
				})
				.always(function() {
					if(typeof callback == "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.raphael.enabled = false;
			if(typeof callback == "function")
				callback();
		}
	};

	NETDATA.raphaelChartUpdate = function(state, data) {
		$(state.element_chart).raphael(data.result, {
			width: state.chartWidth(),
			height: state.chartHeight()
		})
	};

	NETDATA.raphaelChartCreate = function(state, data) {
		$(state.element_chart).raphael(data.result, {
			width: state.chartWidth(),
			height: state.chartHeight()
		})
	};

	// ----------------------------------------------------------------------------------------------------------------
	// google charts

	NETDATA.googleInitialize = function(callback) {
		if(typeof netdataNoGoogleCharts == 'undefined' || !netdataNoGoogleCharts) {
			$.getScript(NETDATA.google_js)
				.done(function() {
					NETDATA.registerChartLibrary('google', NETDATA.google_js);

					google.load('visualization', '1.1', {
						'packages': ['corechart', 'controls'],
						'callback': callback
					});
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.google_js);
					if(typeof callback == "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.google.enabled = false;
			if(typeof callback == "function")
				callback();
		}
	};

	NETDATA.googleChartUpdate = function(state, data) {
		var datatable = new google.visualization.DataTable(data.result);
		state.google_instance.draw(datatable, state.google_options);
	};

	NETDATA.googleChartCreate = function(state, data) {
		var datatable = new google.visualization.DataTable(data.result);

		state.google_options = {
			// do not set width, height - the chart resizes itself
			//width: state.chartWidth(),
			//height: state.chartHeight(),
			lineWidth: 1,
			title: state.chart.title,
			fontSize: 11,
			hAxis: {
			//	title: "Time of Day",
			//	format:'HH:mm:ss',
				viewWindowMode: 'maximized',
				slantedText: false,
				format:'HH:mm:ss',
				textStyle: {
					fontSize: 9
				},
				gridlines: {
					color: '#EEE'
				}
			},
			vAxis: {
				title: state.chart.units,
				viewWindowMode: 'pretty',
				minValue: -0.1,
				maxValue: 0.1,
				direction: 1,
				textStyle: {
					fontSize: 9
				},
				gridlines: {
					color: '#EEE'
				}
			},
			chartArea: {
				width: '65%',
				height: '80%'
			},
			focusTarget: 'category',
			annotation: {
				'1': {
					style: 'line'
				}
			},
			pointsVisible: 0,
			titlePosition: 'out',
			titleTextStyle: {
				fontSize: 11
			},
			tooltip: {
				isHtml: false,
				ignoreBounds: true,
				textStyle: {
					fontSize: 9
				}
			},
			curveType: 'function',
			areaOpacity: 0.3,
			isStacked: false
		};

		switch(state.chart.chart_type) {
			case "area":
				state.google_options.vAxis.viewWindowMode = 'maximized';
				state.google_instance = new google.visualization.AreaChart(state.element_chart);
				break;

			case "stacked":
				state.google_options.isStacked = true;
				state.google_options.areaOpacity = 0.85;
				state.google_options.vAxis.viewWindowMode = 'maximized';
				state.google_options.vAxis.minValue = null;
				state.google_options.vAxis.maxValue = null;
				state.google_instance = new google.visualization.AreaChart(state.element_chart);
				break;

			default:
			case "line":
				state.google_options.lineWidth = 2;
				state.google_instance = new google.visualization.LineChart(state.element_chart);
				break;
		}

		state.google_instance.draw(datatable, state.google_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Charts Libraries Registration

	NETDATA.chartLibraries = {
		"dygraph": {
			initialize: NETDATA.dygraphInitialize,
			create: NETDATA.dygraphChartCreate,
			update: NETDATA.dygraphChartUpdate,
			setSelection: NETDATA.dygraphSetSelection,
			clearSelection:  NETDATA.dygraphClearSelection,
			initialized: false,
			enabled: true,
			format: 'json',
			options: 'ms|flip',
			jsonWrapper: true,
			legend: 'right-side',
			autoresize: true,
			max_updates_to_recreate: 5000,
			pixels_per_point: 2,
			detects_dimensions_on_update: false
		},
		"sparkline": {
			initialize: NETDATA.sparklineInitialize,
			create: NETDATA.sparklineChartCreate,
			update: NETDATA.sparklineChartUpdate,
			setSelection: null,
			clearSelection: null,
			initialized: false,
			enabled: true,
			format: 'array',
			options: 'flip|abs',
			jsonWrapper: true,
			legend: 'sparkline',
			autoresize: false,
			max_updates_to_recreate: 5000,
			pixels_per_point: 2,
			detects_dimensions_on_update: false
		},
		"peity": {
			initialize: NETDATA.peityInitialize,
			create: NETDATA.peityChartCreate,
			update: NETDATA.peityChartUpdate,
			setSelection: null,
			clearSelection: null,
			initialized: false,
			enabled: true,
			format: 'ssvcomma',
			options: 'null2zero|flip|abs',
			jsonWrapper: true,
			legend: 'sparkline',
			autoresize: false,
			max_updates_to_recreate: 5000,
			pixels_per_point: 2,
			detects_dimensions_on_update: false
		},
		"morris": {
			initialize: NETDATA.morrisInitialize,
			create: NETDATA.morrisChartCreate,
			update: NETDATA.morrisChartUpdate,
			setSelection: null,
			clearSelection: null,
			initialized: false,
			enabled: true,
			format: 'json',
			options: 'objectrows|ms',
			jsonWrapper: true,
			legend: 'none',
			autoresize: false,
			max_updates_to_recreate: 50,
			pixels_per_point: 15,
			detects_dimensions_on_update: false
		},
		"google": {
			initialize: NETDATA.googleInitialize,
			create: NETDATA.googleChartCreate,
			update: NETDATA.googleChartUpdate,
			setSelection: null,
			clearSelection: null,
			initialized: false,
			enabled: true,
			format: 'datatable',
			options: '',
			jsonWrapper: true,
			legend: 'none',
			autoresize: false,
			max_updates_to_recreate: 300,
			pixels_per_point: 4,
			detects_dimensions_on_update: true
		},
		"raphael": {
			initialize: NETDATA.raphaelInitialize,
			create: NETDATA.raphaelChartCreate,
			update: NETDATA.raphaelChartUpdate,
			setSelection: null,
			clearSelection: null,
			initialized: false,
			enabled: true,
			format: 'json',
			options: '',
			jsonWrapper: true,
			legend: 'none',
			autoresize: false,
			max_updates_to_recreate: 1000,
			pixels_per_point: 1,
			detects_dimensions_on_update: false
		}
	};

	NETDATA.registerChartLibrary = function(library, url) {
		if(NETDATA.options.debug.libraries)
			console.log("registering chart library: " + library);

		NETDATA.chartLibraries[library].url = url;
		NETDATA.chartLibraries[library].initialized = true;
		NETDATA.chartLibraries[library].enabled = true;
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Start up

	NETDATA.errorReset();
	NETDATA._loadjQuery(function() {
		$.getScript(NETDATA.serverDefault + 'lib/visible.js').then(function() {
			NETDATA._loadCSS(NETDATA.dashboard_css);

			if(typeof netdataDontStart == 'undefined' || !netdataDontStart)
				NETDATA.start();
		})
	});

})(window);
