/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { persistStubPost, setWidgetAreasOpenState } from './actions';
import {
	KIND,
	WIDGET_AREA_ENTITY_TYPE,
	buildWidgetsQuery,
	buildWidgetAreasQuery,
	buildWidgetAreaPostId,
	buildWidgetAreasPostId,
} from './utils';
import { transformWidgetToBlock } from './transformers';

export const getWidgetAreas = () => async ( { dispatch, registry } ) => {
	const query = buildWidgetAreasQuery();
	const widgetAreas = await registry
		.resolveSelect( coreStore )
		.getEntityRecords( KIND, WIDGET_AREA_ENTITY_TYPE, query );

	const widgetAreaBlocks = [];
	const sortedWidgetAreas = widgetAreas.sort( ( a, b ) => {
		if ( a.id === 'wp_inactive_widgets' ) {
			return 1;
		}
		if ( b.id === 'wp_inactive_widgets' ) {
			return -1;
		}
		return 0;
	} );
	for ( const widgetArea of sortedWidgetAreas ) {
		widgetAreaBlocks.push(
			createBlock( 'core/widget-area', {
				id: widgetArea.id,
				name: widgetArea.name,
			} )
		);

		if ( ! widgetArea.widgets.length ) {
			// If this widget area has no widgets, it won't get a post setup by
			// the getWidgets resolver.
			dispatch(
				persistStubPost( buildWidgetAreaPostId( widgetArea.id ), [] )
			);
		}
	}

	const widgetAreasOpenState = {};
	widgetAreaBlocks.forEach( ( widgetAreaBlock, index ) => {
		// Defaults to open the first widget area.
		widgetAreasOpenState[ widgetAreaBlock.clientId ] = index === 0;
	} );
	dispatch( setWidgetAreasOpenState( widgetAreasOpenState ) );

	dispatch( persistStubPost( buildWidgetAreasPostId(), widgetAreaBlocks ) );
};

export const getWidgets = () => async ( { dispatch, registry } ) => {
	const query = buildWidgetsQuery();
	const widgets = await registry
		.resolveSelect( coreStore )
		.getEntityRecords( 'root', 'widget', query );

	const groupedBySidebar = {};

	for ( const widget of widgets ) {
		const block = transformWidgetToBlock( widget );
		groupedBySidebar[ widget.sidebar ] =
			groupedBySidebar[ widget.sidebar ] || [];
		groupedBySidebar[ widget.sidebar ].push( block );
	}

	for ( const sidebarId in groupedBySidebar ) {
		if ( groupedBySidebar.hasOwnProperty( sidebarId ) ) {
			// Persist the actual post containing the widget block
			dispatch(
				persistStubPost(
					buildWidgetAreaPostId( sidebarId ),
					groupedBySidebar[ sidebarId ]
				)
			);
		}
	}
};
