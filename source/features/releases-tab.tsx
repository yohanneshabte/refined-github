import cache from 'webext-storage-cache';
import React from 'dom-chef';
import select from 'select-dom';
import features from '../libs/features';
import * as api from '../libs/api';
import * as icons from '../libs/icons';
import {getRepoURL, getRepoGQL} from '../libs/utils';
import {isRepoRoot, isReleasesOrTags} from '../libs/page-detect';

const repoUrl = getRepoURL();
const cacheKey = `releases-count:${repoUrl}`;

function parseCountFromDom(): number | void {
	if (isRepoRoot()) {
		const releasesCountElement = select('.numbers-summary a[href$="/releases"] .num');
		return Number(releasesCountElement ? releasesCountElement.textContent!.replace(/,/g, '') : 0);
	}
}

async function fetchFromApi(): Promise<number | undefined> {
	const {repository} = await api.v4(`
		repository(${getRepoGQL()}) {
			refs(refPrefix: "refs/tags/") {
				totalCount
			}
		}
	`);

	return repository.refs.totalCount;
}

const getReleaseCount = cache.function(async () => parseCountFromDom() ?? fetchFromApi(), {
	expiration: 3,
	cacheKey: () => cacheKey
});

async function init(): Promise<false | void> {
	// Always prefer the information in the DOM
	if (isRepoRoot()) {
		await cache.delete(cacheKey);
	}

	const count = await getReleaseCount();
	if (count === 0) {
		return false;
	}

	const releasesTab = (
		<a href={`/${repoUrl}/releases`} className="reponav-item" data-hotkey="g r">
			{icons.tag()}
			<span> Releases </span>
			{count === undefined ? '' : <span className="Counter">{count}</span>}
		</a>
	);
	select('.reponav-dropdown')!.before(releasesTab);

	// Update "selected" tab mark
	if (isReleasesOrTags()) {
		const selected = select('.reponav-item.selected');
		if (selected) {
			selected.classList.remove('js-selected-navigation-item', 'selected');
		}

		releasesTab.classList.add('js-selected-navigation-item', 'selected');
		releasesTab.dataset.selectedLinks = 'repo_releases'; // Required for ajaxLoad
	}
}

features.add({
	id: __featureName__,
	description: 'Adds a `Releases` tab and a keyboard shortcut: `g` `r`.',
	screenshot: 'https://cloud.githubusercontent.com/assets/170270/13136797/16d3f0ea-d64f-11e5-8a45-d771c903038f.png',
	include: [
		features.isRepo
	],
	load: features.onAjaxedPages,
	shortcuts: {
		'g r': 'Go to Releases'
	},
	init
});
