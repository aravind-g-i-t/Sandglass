/* global document */


document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('input[name="search"]');
    let debounceTimeout;

    function handleAutocompleteResponse(response) {
        return response.json();
    }

    function fetchSuggestions(query) {
        fetch(`/autocomplete?query=${encodeURIComponent(query)}`)
            .then(handleAutocompleteResponse)
            .then(renderAutocompleteSuggestions)
            .catch(() => closeAutocomplete());
    }

    function renderAutocompleteSuggestions(suggestions) {
        let autocompleteBox = document.querySelector('.autocomplete-box');

        if (!autocompleteBox) {
            autocompleteBox = document.createElement('div');
            autocompleteBox.classList.add('autocomplete-box');
            searchInput.parentNode.appendChild(autocompleteBox);
        }

        autocompleteBox.innerHTML = suggestions.map(item => `
    <div class="autocomplete-item">
        <img src="/uploads/${item.photoUrl}" alt="${item.name}" class="autocomplete-photo">
        <div class="autocomplete-info">
            <div class="autocomplete-id" hidden>${item.id}</div>
            <div class="autocomplete-name">${item.name}</div>
            <div class="autocomplete-category">${item.category}</div>
        </div>
    </div>
`).join('');

        autocompleteBox.style.display = 'block'; // Ensure the box is visible

        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => selectSuggestion(item));
        });
    }

    function selectSuggestion(item) {
    const productId = item.querySelector('.autocomplete-id').textContent;

    globalThis.location.href = `/product_details?id=${productId}`;
}

    function closeAutocomplete() {
        const autocompleteBox = document.querySelector('.autocomplete-box');
        if (autocompleteBox) {
            autocompleteBox.style.display = 'none'; // Hide the box instead of removing it
        }
    }

    function handleSearchInput() {
        const query = searchInput.value.trim();

        clearTimeout(debounceTimeout);

        debounceTimeout = setTimeout(() => {
            if (query.length > 0) {
                fetchSuggestions(query);
            } else {
                closeAutocomplete(); // Close if input is empty
            }
        }, 300); // Delay of 300ms
    }

    function handleSearchFocus() {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            fetchSuggestions(query);
        }
    }

    function handleOutsideClick(e) {
        const autocompleteBox = document.querySelector('.autocomplete-box');
        const clickedOutsideInput = !searchInput.contains(e.target);
        const clickedOutsideBox = !autocompleteBox || !autocompleteBox.contains(e.target);

        if (clickedOutsideInput && clickedOutsideBox) {
            closeAutocomplete();
        }
    }

    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    document.addEventListener('click', handleOutsideClick);
});