
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('input[name="search"]');
    let debounceTimeout;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();

        clearTimeout(debounceTimeout);

        debounceTimeout = setTimeout(() => {
            if (query.length > 0) {
                fetch(`/autocomplete?query=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        renderAutocompleteSuggestions(data);
                    })
                    .catch(error => console.error('Error fetching autocomplete data:', error));
            } else {
                closeAutocomplete(); // Close if input is empty
            }
        }, 300); // Delay of 300ms
    });

    function renderAutocompleteSuggestions(suggestions) {
        let autocompleteBox = document.querySelector('.autocomplete-box');

        if (!autocompleteBox) {
            autocompleteBox = document.createElement('div');
            autocompleteBox.classList.add('autocomplete-box');
            searchInput.parentNode.appendChild(autocompleteBox);
        }

        autocompleteBox.innerHTML = suggestions.map(item =>
            `<div class="autocomplete-item">
                        <img src="/uploads/${item.photoUrl}" alt="${item.name}" class="autocomplete-photo">
                        <div class="autocomplete-info">
                            <div class="autocomplete-name">${item.name}</div>
                            <div class="autocomplete-category">${item.category}</div>
                        </div>
                    </div>`
        ).join('');

        autocompleteBox.style.display = 'block'; // Ensure the box is visible

        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.querySelector('.autocomplete-name').textContent;
                document.getElementById('searchForm').submit();
                closeAutocomplete(); // Close after selecting an item
            });
        });
    }

    function closeAutocomplete() {
        const autocompleteBox = document.querySelector('.autocomplete-box');
        if (autocompleteBox) {
            autocompleteBox.style.display = 'none'; // Hide the box instead of removing it
        }
    }

    // Re-open autocomplete if the input is focused and has a value
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            fetch(`/autocomplete?query=${encodeURIComponent(searchInput.value.trim())}`)
                .then(response => response.json())
                .then(data => {
                    renderAutocompleteSuggestions(data);
                })
                .catch(error => console.error('Error fetching autocomplete data:', error));
        }
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !document.querySelector('.autocomplete-box').contains(e.target)) {
            closeAutocomplete();
        }
    });
});


