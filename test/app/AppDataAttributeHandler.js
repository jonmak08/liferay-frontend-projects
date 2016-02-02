'use strict';

import { dom } from 'metal';
import globals from '../../src/globals/globals';
import AppDataAttributeHandler from '../../src/app/AppDataAttributeHandler';
import Screen from '../../src/screen/Screen';

describe('AppDataAttributeHandler', function() {

	before(function() {
		globals.document.body.setAttribute('data-senna', '');
		globals.window.senna = {
			Screen: Screen
		};
	});

	after(function() {
		globals.document.body.removeAttribute('data-senna');
		delete globals.window.senna;
	});

	it('should throw error when base element not specified', function() {
		assert.throws(function() {
			new AppDataAttributeHandler().handle();
		}, Error);
	});

	it('should throw error when base element not valid', function() {
		assert.throws(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement({});
			appDataAttributeHandler.handle();
		}, Error);
	});

	it('should throw error when already handled', function() {
		assert.throws(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement(globals.document.body);
			appDataAttributeHandler.handle();
			appDataAttributeHandler.handle();
		}, Error);
	});

	it('should not throw error when base element specified', function() {
		assert.doesNotThrow(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement(globals.document.body);
			appDataAttributeHandler.handle();
			appDataAttributeHandler.dispose();
		});
	});

	it('should dispose internal app when disposed', function() {
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		appDataAttributeHandler.dispose();
		assert.ok(appDataAttributeHandler.getApp().isDisposed());
	});

	it('should dispose when not handled', function() {
		assert.doesNotThrow(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.dispose();
		});
	});

	it('should get app', function() {
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.ok(appDataAttributeHandler.getApp());
		appDataAttributeHandler.dispose();
	});

	it('should get base element', function() {
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		assert.strictEqual(globals.document.body, appDataAttributeHandler.getBaseElement());
	});

	it('should add app surfaces from document', function() {
		enterDocumentSurfaceElement('surfaceId');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.ok('surfaceId' in appDataAttributeHandler.getApp().surfaces);
		appDataAttributeHandler.dispose();
		exitDocumentSurfaceElement('surfaceId');
	});

	it('should adds random id to body without id when used as app surface', function() {
		globals.document.body.setAttribute('data-senna-surface', '');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.ok(globals.document.body);
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-surface');
	});

	it('should throw error when adding app surfaces from document missing id', function() {
		enterDocumentSurfaceElementMissingId('surfaceId');
		assert.throws(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement(globals.document.body);
			appDataAttributeHandler.handle();
		}, Error);
		exitDocumentSurfaceElementMissingId('surfaceId');
	});

	it('should add default route if not found in document', function() {
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.ok(appDataAttributeHandler.getApp().hasRoutes());
		appDataAttributeHandler.dispose();
	});

	it('should add routes from document', function() {
		enterDocumentRouteElement('/path1');
		enterDocumentRouteElement('/path2');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual(2, appDataAttributeHandler.getApp().routes.length);
		appDataAttributeHandler.dispose();
		exitDocumentRouteElement('/path1');
		exitDocumentRouteElement('/path2');
	});

	it('should add routes from document with regex paths', function() {
		enterDocumentRouteElement('regex:[a-z]');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.ok(appDataAttributeHandler.getApp().routes[0].getPath() instanceof RegExp);
		appDataAttributeHandler.dispose();
		exitDocumentRouteElement('regex:[a-z]');
	});

	it('should throw error when adding routes from document with missing screen type', function() {
		enterDocumentRouteElementMissingScreenType('/path');
		assert.throws(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement(globals.document.body);
			appDataAttributeHandler.handle();
		}, Error);
		exitDocumentRouteElement('/path');
	});

	it('should throw error when adding routes from document with missing path', function() {
		enterDocumentRouteElementMissingPath();
		assert.throws(function() {
			var appDataAttributeHandler = new AppDataAttributeHandler();
			appDataAttributeHandler.setBaseElement(globals.document.body);
			appDataAttributeHandler.handle();
		}, Error);
		exitDocumentRouteElementMissingPath();
	});

	it('should set base path from data attribute', function() {
		globals.document.body.setAttribute('data-senna-base-path', '/base');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual('/base', appDataAttributeHandler.getApp().getBasePath());
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-base-path');
	});

	it('should set link selector from data attribute', function() {
		globals.document.body.setAttribute('data-senna-link-selector', 'a');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual('a', appDataAttributeHandler.getApp().getLinkSelector());
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-link-selector');
	});

	it('should set loading css class from data attribute', function() {
		globals.document.body.setAttribute('data-senna-loading-css-class', 'loading');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual('loading', appDataAttributeHandler.getApp().getLoadingCssClass());
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-loading-css-class');
	});

	it('should set update scroll position to false from data attribute', function() {
		globals.document.body.setAttribute('data-senna-update-scroll-position', 'false');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual(false, appDataAttributeHandler.getApp().getUpdateScrollPosition());
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-update-scroll-position');
	});

	it('should set update scroll position to true from data attribute', function() {
		globals.document.body.setAttribute('data-senna-update-scroll-position', 'true');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		assert.strictEqual(true, appDataAttributeHandler.getApp().getUpdateScrollPosition());
		appDataAttributeHandler.dispose();
		globals.document.body.removeAttribute('data-senna-update-scroll-position');
	});

	it('should dispatch app from data attribute', function(done) {
		globals.document.body.setAttribute('data-senna-dispatch', '');
		var appDataAttributeHandler = new AppDataAttributeHandler();
		appDataAttributeHandler.setBaseElement(globals.document.body);
		appDataAttributeHandler.handle();
		appDataAttributeHandler.getApp().on('endNavigate', () => {
			appDataAttributeHandler.dispose();
			done();
		});
		globals.document.body.removeAttribute('data-senna-dispatch');
	});

});

function enterDocumentRouteElement(path) {
	dom.enterDocument('<link href="' + path + '" rel="senna-route" type="senna.Screen"></link>');
	return document.querySelector('link[href="' + path + '"]');
}

function enterDocumentRouteElementMissingPath() {
	dom.enterDocument('<link id="routeElementMissingPath" rel="senna-route" type="senna.Screen"></link>');
	return document.getElementById('routeElementMissingPath');
}

function enterDocumentRouteElementMissingScreenType(path) {
	dom.enterDocument('<link href="' + path + '" rel="senna-route"></link>');
	return document.querySelector('link[href="' + path + '"]');
}

function enterDocumentSurfaceElement(surfaceId) {
	dom.enterDocument('<div id="' + surfaceId + '" data-senna-surface></div>');
	return document.getElementById(surfaceId);
}

function enterDocumentSurfaceElementMissingId(surfaceId) {
	dom.enterDocument('<div data-id="' + surfaceId + '" data-senna-surface></div>');
	return document.getElementById(surfaceId);
}

function exitDocumentRouteElement(path) {
	return dom.exitDocument(document.querySelector('link[href="' + path + '"]'));
}

function exitDocumentRouteElementMissingPath() {
	return dom.exitDocument(document.getElementById('routeElementMissingPath'));
}

function exitDocumentSurfaceElement(surfaceId) {
	return dom.exitDocument(document.getElementById(surfaceId));
}

function exitDocumentSurfaceElementMissingId(surfaceId) {
	return dom.exitDocument(document.querySelector('[data-id="' + surfaceId + '"]'));
}
