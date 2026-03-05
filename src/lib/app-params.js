const isNode = typeof window === 'undefined';
const storage = !isNode ? window.localStorage : null;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const normalizeParamValue = (value) => {
	if (value == null) {
		return null;
	}
	const normalized = String(value).trim();
	if (!normalized) {
		return null;
	}
	if (normalized === 'null' || normalized === 'undefined') {
		return null;
	}
	return normalized;
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `app_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = normalizeParamValue(urlParams.get(paramName));
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage?.setItem(storageKey, searchParam);
		return searchParam;
	}
	const normalizedDefaultValue = normalizeParamValue(defaultValue);
	if (normalizedDefaultValue) {
		storage?.setItem(storageKey, normalizedDefaultValue);
		return normalizedDefaultValue;
	}
	const storedValue = normalizeParamValue(storage?.getItem(storageKey));
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage?.removeItem('app_access_token');
		storage?.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_API_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
