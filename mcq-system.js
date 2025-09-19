// ===== CIVIL ENGINEERING MCQ SYSTEM =====
class MCQSystem {
    constructor() {
        this.questions = this.loadQuestions();
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.testMode = false;
        this.testStartTime = null;
        this.selectedQuestions = [];
        this.testStats = {
            correct: 0,
            wrong: 0,
            unanswered: 0,
            timeTaken: 0
        };
        this.studyTips = this.loadStudyTips();
        this.questionCategories = this.getQuestionCategories();
    }

    loadQuestions() {
        return [
            // Materials and Construction
            {
                id: 1,
                category: "Materials & Construction",
                question: "The maximum percentage of water absorption of 2nd class bricks in 24 hrs should be limited to",
                options: ["10%", "15%", "20%", "25%"],
                correct: 2,
                explanation: "As per IS standards, 2nd class bricks should have water absorption not more than 20% in 24 hours."
            },
            {
                id: 2,
                category: "Materials & Construction",
                question: "The process involved in the manufacture of wrought iron from pig iron is known as",
                options: ["Refining", "Pudding", "Rolling", "All of the above"],
                correct: 1,
                explanation: "Pudding is the process used to convert pig iron into wrought iron by removing impurities."
            },
            {
                id: 3,
                category: "Materials & Construction",
                question: "The cement mortar mix generally used for masonry work",
                options: ["1:3", "1:4", "1:5", "1:6"],
                correct: 1,
                explanation: "1:4 cement mortar mix is commonly used for masonry work in construction."
            },
            {
                id: 4,
                category: "Materials & Construction",
                question: "The property due to which steel can withstand hammer blows is called",
                options: ["Toughness", "Hardness", "Ductility", "Malleability"],
                correct: 0,
                explanation: "Toughness is the ability of a material to absorb energy and withstand shock loads without breaking."
            },
            {
                id: 5,
                category: "Materials & Construction",
                question: "The crushing strength of 1st class brick should not be less than",
                options: ["25 kg/cm²", "70 kg/cm²", "105 kg/cm²", "140 kg/cm²"],
                correct: 2,
                explanation: "First class bricks should have a minimum crushing strength of 105 kg/cm² as per IS standards."
            },

            // Geotechnical Engineering
            {
                id: 6,
                category: "Geotechnical Engineering",
                question: "In Geotechnical Engineering, soil is considered as a ___ phase material",
                options: ["1", "2", "3", "4"],
                correct: 2,
                explanation: "Soil is considered as a three-phase material consisting of solid particles, water, and air."
            },
            {
                id: 7,
                category: "Geotechnical Engineering",
                question: "The water content corresponding to the maximum density in compaction curve is called",
                options: ["Water content of compacted soil", "Optimum water content", "Air void water content", "None of the mentioned"],
                correct: 1,
                explanation: "The optimum water content corresponds to the maximum dry density achievable in standard Proctor test."
            },
            {
                id: 8,
                category: "Geotechnical Engineering",
                question: "The equipotential line in seepage through a soil medium is defined as the",
                options: ["path of particles of water through a saturated soil mass", "line connecting points of equal head of water", "flow of movement of fine particles of soil", "direction of the flow particle"],
                correct: 1,
                explanation: "Equipotential lines connect points having the same total head in seepage analysis."
            },
            {
                id: 9,
                category: "Geotechnical Engineering",
                question: "The active earth pressure of a soil is proportional to tan²(45° - φ/2) where φ is the angle of friction of the soil",
                options: ["tan²(45° - φ/2)", "tan²(45° + φ/2)", "tan²(45° - φ)", "tan²(45° + φ)"],
                correct: 0,
                explanation: "According to Rankine's theory, active earth pressure coefficient Ka = tan²(45° - φ/2)."
            },
            {
                id: 10,
                category: "Geotechnical Engineering",
                question: "The minimum water content at which the soil retains its liquid state and also possesses a small shearing strength against flowing, is known as",
                options: ["liquid limit", "plastic limit", "shrinkage limit", "permeability limit"],
                correct: 0,
                explanation: "Liquid limit is the water content at which soil behaves as a liquid and has a small shear strength."
            },

            // Hydraulics and Water Resources
            {
                id: 11,
                category: "Hydraulics & Water Resources",
                question: "Pascals law states that pressure at a point is equal in all direction",
                options: ["in a liquid at rest", "in a fluid at rest", "in a laminar flow", "in a turbulent flow"],
                correct: 1,
                explanation: "Pascal's law applies to fluids (both liquids and gases) at rest, stating pressure is transmitted equally in all directions."
            },
            {
                id: 12,
                category: "Hydraulics & Water Resources",
                question: "Bernoulli's theorem deals with the law of conservation of",
                options: ["mass", "momentum", "energy", "none of the above"],
                correct: 2,
                explanation: "Bernoulli's equation is based on the principle of conservation of energy for fluid flow."
            },
            {
                id: 13,
                category: "Hydraulics & Water Resources",
                question: "The Froude's number for a flow in a channel section is 1. What type of flow is it?",
                options: ["Sub Critical", "Critical", "Super critical", "Laminar"],
                correct: 1,
                explanation: "When Froude number = 1, the flow is critical. Fr < 1 is subcritical, Fr > 1 is supercritical."
            },
            {
                id: 14,
                category: "Hydraulics & Water Resources",
                question: "For floating body, if the meta-centre is above the centre of gravity, the equilibrium is called",
                options: ["stable", "unstable", "neutral", "none of the above"],
                correct: 0,
                explanation: "When metacenter is above center of gravity, the floating body is in stable equilibrium."
            },
            {
                id: 15,
                category: "Hydraulics & Water Resources",
                question: "Energy gradient line takes into consideration",
                options: ["potential and kinetic heads only", "potential and pressure heads only", "kinetic and pressure heads only", "potential, kinetic and pressure heads"],
                correct: 3,
                explanation: "Energy gradient line represents the sum of potential head, pressure head, and velocity head."
            },

            // Structural Engineering
            {
                id: 16,
                category: "Structural Engineering",
                question: "The minimum deflection in timber or joints should not be greater than",
                options: ["Span/300", "Span/325", "Span/360", "Span/380"],
                correct: 2,
                explanation: "As per IS codes, maximum deflection for timber should not exceed span/360."
            },
            {
                id: 17,
                category: "Structural Engineering",
                question: "Minimum tension steel in RC beam needs to be provided to",
                options: ["Prevent sudden failure", "control excessive deflection", "arrest crack width", "Prevent surface hair cracks"],
                correct: 0,
                explanation: "Minimum steel prevents sudden failure by ensuring ductile behavior after cracking."
            },
            {
                id: 18,
                category: "Structural Engineering",
                question: "The characteristic strength of concrete is",
                options: ["Higher than the average cube strength", "Lower than the average cube strength", "The same as the average cube strength", "higher than 90% of the average cube strength"],
                correct: 1,
                explanation: "Characteristic strength is the strength below which not more than 5% of test results are expected to fall."
            },
            {
                id: 19,
                category: "Structural Engineering",
                question: "Simple bending equation is M/I = σ/y = E/R",
                options: ["M/I = σ/y = E/R", "M/I = σ/y = R/E", "M/σ = I/y = E/R", "None of the above"],
                correct: 0,
                explanation: "The simple bending equation relates moment (M), section modulus (I), stress (σ), distance from neutral axis (y), modulus of elasticity (E), and radius of curvature (R)."
            },
            {
                id: 20,
                category: "Structural Engineering",
                question: "Degree of static indeterminacy Ds = 0, structure is",
                options: ["Unstable", "Stable and determinate", "Stable and indeterminate", "None of the above"],
                correct: 1,
                explanation: "When degree of static indeterminacy is zero, the structure is statically determinate."
            },

            // Water Supply and Sanitary Engineering
            {
                id: 21,
                category: "Water Supply & Sanitary",
                question: "According to WHO NDWQS, a desirable pH value for domestic water is",
                options: ["7", "6 to 9", "5 to 9", "6.5 to 8.5"],
                correct: 3,
                explanation: "WHO recommends pH range of 6.5 to 8.5 for drinking water quality."
            },
            {
                id: 22,
                category: "Water Supply & Sanitary",
                question: "The most commonly used coagulant is",
                options: ["chlorine", "alum", "ferrous oxide", "ferric oxide"],
                correct: 1,
                explanation: "Aluminum sulphate (alum) is the most commonly used coagulant in water treatment."
            },
            {
                id: 23,
                category: "Water Supply & Sanitary",
                question: "A septic tank is a",
                options: ["sedimentation tank", "aeration tank", "digestion tank", "combination of sedimentation and digestion tank"],
                correct: 3,
                explanation: "Septic tank combines both sedimentation and anaerobic digestion processes."
            },
            {
                id: 24,
                category: "Water Supply & Sanitary",
                question: "The minimum DO in the water to save the aquatic life is",
                options: ["1 ppm", "2 ppm", "4 ppm", "8 ppm"],
                correct: 2,
                explanation: "Minimum dissolved oxygen of 4 ppm is required to maintain aquatic life in water bodies."
            },
            {
                id: 25,
                category: "Water Supply & Sanitary",
                question: "The slow sand filters can remove bacteria as much as ___ percent",
                options: ["70 to 80", "80 to 90", "90 to 98", "98 to 99"],
                correct: 3,
                explanation: "Slow sand filters are highly effective and can remove 98-99% of bacteria through biological action."
            },

            // Transportation Engineering
            {
                id: 26,
                category: "Transportation Engineering",
                question: "According to Nepal Road Standard NRS2070, minimum design speed for hair pin bends is",
                options: ["10 kmph", "20 kmph", "25 kmph", "30 kmph"],
                correct: 1,
                explanation: "As per NRS 2070, minimum design speed for hairpin bends is 20 kmph."
            },
            {
                id: 27,
                category: "Transportation Engineering",
                question: "According to Nepal Road Standard NRS2070, width of intermediate lane is taken as",
                options: ["3.5 m", "3.75 m", "5.5 m", "6 m"],
                correct: 1,
                explanation: "NRS 2070 specifies intermediate lane width as 3.75 meters."
            },
            {
                id: 28,
                category: "Transportation Engineering",
                question: "California bearing ratio method of designing flexible pavement is more accurate as it involves",
                options: ["characteristics of soil", "traffic intensities", "character of the road making material", "none of these"],
                correct: 0,
                explanation: "CBR method considers the strength characteristics of subgrade soil for pavement design."
            },
            {
                id: 29,
                category: "Transportation Engineering",
                question: "The traffic census is carried out to study",
                options: ["speed and delay", "traffic volume", "road parking", "origin and destination"],
                correct: 1,
                explanation: "Traffic census is primarily conducted to determine traffic volume on roads."
            },
            {
                id: 30,
                category: "Transportation Engineering",
                question: "The advantage of a rotary is",
                options: ["traffic is in continuous motion", "no waiting by traffic", "vehicles move in the same direction", "left turn is relatively easy"],
                correct: 0,
                explanation: "The main advantage of rotary is that traffic moves continuously without stopping."
            },

            // Environmental Engineering
            {
                id: 31,
                category: "Environmental Engineering",
                question: "According to EPA2019 2076, Ministry means",
                options: ["Ministry of Forest and Environment (MOFE)", "Ministry of Energy, Water Resources and Irrigation (MOEWRI)", "Ministry of Health and Population (MOHP)", "Ministry of Water Supply (MOWSS)"],
                correct: 0,
                explanation: "As per EPA 2019, Ministry refers to Ministry of Forest and Environment."
            },
            {
                id: 32,
                category: "Environmental Engineering",
                question: "Screening criteria for BES study is based on Schedule ___ of Rule 3 of EPR2020",
                options: ["Schedule 1", "Schedule 2", "Schedule 3", "Schedule 4"],
                correct: 0,
                explanation: "BES (Basic Environmental Study) screening criteria is based on Schedule 1 of EPR 2020."
            },
            {
                id: 33,
                category: "Environmental Engineering",
                question: "Scoping is required only in",
                options: ["BES", "IEE", "EIA", "all of the above"],
                correct: 2,
                explanation: "Scoping is a mandatory process required only for Environmental Impact Assessment (EIA)."
            },

            // Surveying
            {
                id: 34,
                category: "Surveying",
                question: "The angle which the true meridian makes with magnetic meridian is called",
                options: ["Magnetic declination", "true declination", "dip", "Azimuth"],
                correct: 0,
                explanation: "Magnetic declination is the angle between true north and magnetic north."
            },
            {
                id: 35,
                category: "Surveying",
                question: "According to ISI method of measurement, the order of the sequence is",
                options: ["breadth, height, length", "breadth, length, height", "length, breadth, height", "none of these"],
                correct: 2,
                explanation: "ISI method follows the sequence: length, breadth, height for measurements."
            },

            // Project Management & Professional Practice
            {
                id: 36,
                category: "Professional Practice",
                question: "A ___ is a set of rules that specify the standards for constructed objects such as buildings",
                options: ["Building code", "Building bye-laws", "IS code", "Procedure"],
                correct: 0,
                explanation: "Building codes specify minimum standards for construction to ensure safety and health."
            },
            {
                id: 37,
                category: "Professional Practice",
                question: "The total number of members in Nepal Engineering Council is",
                options: ["9", "12", "15", "18"],
                correct: 1,
                explanation: "Nepal Engineering Council has 12 members as per the NEC Act."
            },
            {
                id: 38,
                category: "Professional Practice",
                question: "Code of conduct defines",
                options: ["what should be", "what should not be", "what had been", "what will be"],
                correct: 0,
                explanation: "Code of conduct defines what should be done - the expected behavior and standards."
            },

            // Additional challenging questions
            {
                id: 39,
                category: "Structural Engineering",
                question: "The moment of inertia of rectangular section is",
                options: ["BD²/6", "BD³/12", "BD³/36", "BD³/3"],
                correct: 1,
                explanation: "For rectangular section, moment of inertia about centroidal axis is BD³/12."
            },
            {
                id: 40,
                category: "Hydraulics & Water Resources",
                question: "Stoke is the unit of",
                options: ["surface tension", "viscosity", "kinematic viscosity", "none of the above"],
                correct: 2,
                explanation: "Stoke is the CGS unit of kinematic viscosity (cm²/s)."
            }
        ];
    }

    loadStudyTips() {
        return {
            "Materials & Construction": [
                "Focus on IS codes for material properties and standards",
                "Remember the grades and classes of materials (bricks, concrete, etc.)",
                "Study manufacturing processes of different materials",
                "Understand strength parameters and testing methods"
            ],
            "Geotechnical Engineering": [
                "Master the three-phase system of soil",
                "Understand Atterberg limits and their significance",
                "Study earth pressure theories (Rankine's and Coulomb's)",
                "Learn about soil compaction and consolidation processes"
            ],
            "Hydraulics & Water Resources": [
                "Understand fundamental principles: Pascal's law, Bernoulli's theorem",
                "Study flow classifications and their characteristics",
                "Learn about channel flow and pipe flow differences",
                "Master stability of floating bodies concepts"
            ],
            "Structural Engineering": [
                "Focus on limit state method and working stress method",
                "Understand deflection limits for different materials",
                "Study indeterminacy and structural analysis methods",
                "Learn reinforcement requirements and design principles"
            ],
            "Water Supply & Sanitary": [
                "Remember WHO/Nepal standards for water quality",
                "Study water treatment processes and their efficiency",
                "Understand sewage treatment plant components",
                "Learn about water distribution system design"
            ],
            "Transportation Engineering": [
                "Study Nepal Road Standards (NRS 2070) thoroughly",
                "Understand geometric design principles",
                "Learn about pavement design methods (CBR, IRC)",
                "Focus on traffic engineering and capacity analysis"
            ],
            "Environmental Engineering": [
                "Study EPA 2019 and EPR 2020 in detail",
                "Understand EIA/IEE/BES processes",
                "Learn about pollution control measures",
                "Focus on environmental impact assessment methods"
            ],
            "Surveying": [
                "Master basic surveying principles and instruments",
                "Understand coordinate systems and transformations",
                "Study traversing and triangulation methods",
                "Learn about modern surveying techniques (GPS, GIS)"
            ],
            "Professional Practice": [
                "Study NEC Act and rules thoroughly",
                "Understand professional ethics and conduct",
                "Learn about building codes and standards",
                "Focus on project management principles"
            ]
        };
    }

    getQuestionCategories() {
        const categories = {};
        this.questions.forEach(q => {
            if (!categories[q.category]) {
                categories[q.category] = [];
            }
            categories[q.category].push(q.id);
        });
        return categories;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    startPractice(category = 'all') {
        this.testMode = false;
        if (category === 'all') {
            this.selectedQuestions = this.shuffleArray(this.questions);
        } else {
            const categoryQuestions = this.questions.filter(q => q.category === category);
            this.selectedQuestions = this.shuffleArray(categoryQuestions);
        }
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.displayQuestion();
    }

    startTest(numQuestions = 20, category = 'all') {
        this.testMode = true;
        this.testStartTime = Date.now();
        
        let availableQuestions;
        if (category === 'all') {
            availableQuestions = [...this.questions];
        } else {
            availableQuestions = this.questions.filter(q => q.category === category);
        }
        
        this.selectedQuestions = this.shuffleArray(availableQuestions).slice(0, Math.min(numQuestions, availableQuestions.length));
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.resetStats();
        this.displayQuestion();
        this.updateTestProgress();
    }

    resetStats() {
        this.testStats = {
            correct: 0,
            wrong: 0,
            unanswered: 0,
            timeTaken: 0
        };
    }

    displayQuestion() {
        if (!this.selectedQuestions || this.selectedQuestions.length === 0) {
            this.showNoQuestionsMessage();
            return;
        }

        if (this.currentQuestionIndex >= this.selectedQuestions.length) {
            if (this.testMode) {
                this.showTestResults();
            } else {
                this.showPracticeComplete();
            }
            return;
        }

        const question = this.selectedQuestions[this.currentQuestionIndex];
        const questionContainer = document.getElementById('mcq-question-container');
        
        if (!questionContainer) {
            console.error('MCQ question container not found!');
            return;
        }

        questionContainer.innerHTML = `
            <div class="mcq-header">
                <div class="question-info">
                    <span class="question-number">Question ${this.currentQuestionIndex + 1} of ${this.selectedQuestions.length}</span>
                    <span class="question-category">${question.category}</span>
                </div>
                ${this.testMode ? `<div class="test-timer" id="test-timer">Time: <span id="timer-display">00:00</span></div>` : ''}
            </div>
            
            <div class="question-content">
                <h3 class="question-text">${question.question}</h3>
                <div class="options-container">
                    ${question.options.map((option, index) => `
                        <div class="option-item" data-option="${index}">
                            <input type="radio" name="answer" value="${index}" id="option-${index}">
                            <label for="option-${index}">
                                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                                <span class="option-text">${option}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="question-controls">
                <button onclick="mcqSystem.previousQuestion()" class="mcq-btn secondary" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                
                <div class="control-center">
                    ${!this.testMode ? `<button onclick="mcqSystem.showHint()" class="mcq-btn hint">
                        <i class="fas fa-lightbulb"></i> Hint
                    </button>` : ''}
                    <button onclick="mcqSystem.submitAnswer()" class="mcq-btn primary">
                        Submit Answer
                    </button>
                </div>
                
                <button onclick="mcqSystem.nextQuestion()" class="mcq-btn secondary">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div id="answer-feedback" class="answer-feedback" style="display: none;"></div>
        `;

        // Add event listeners to options
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const radio = item.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Remove previous selections
                document.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
            });
        });

        // Restore previous answer if exists
        const previousAnswer = this.userAnswers[question.id];
        if (previousAnswer !== undefined) {
            const radio = document.querySelector(`input[value="${previousAnswer}"]`);
            const optionItem = document.querySelector(`.option-item[data-option="${previousAnswer}"]`);
            if (radio && optionItem) {
                radio.checked = true;
                optionItem.classList.add('selected');
            }
        }

        if (this.testMode) {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.testStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    submitAnswer() {
        const selectedOption = document.querySelector('input[name="answer"]:checked');
        const feedbackElement = document.getElementById('answer-feedback');
        
        if (!selectedOption) {
            alert('Please select an answer before submitting.');
            return;
        }

        const question = this.selectedQuestions[this.currentQuestionIndex];
        const userAnswer = parseInt(selectedOption.value);
        const isCorrect = userAnswer === question.correct;
        
        // Store user answer
        this.userAnswers[question.id] = userAnswer;
        
        // Update stats if in test mode
        if (this.testMode) {
            if (isCorrect) {
                this.testStats.correct++;
            } else {
                this.testStats.wrong++;
            }
            this.updateTestProgress();
        }

        // Show feedback
        feedbackElement.style.display = 'block';
        feedbackElement.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        
        const correctOption = String.fromCharCode(65 + question.correct);
        feedbackElement.innerHTML = `
            <div class="feedback-header">
                <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                <span>${isCorrect ? 'Correct!' : 'Incorrect!'}</span>
                ${!isCorrect ? `<span class="correct-answer">Correct answer: ${correctOption}</span>` : ''}
            </div>
            <div class="explanation">
                <strong>Explanation:</strong> ${question.explanation}
            </div>
        `;

        // Disable options and show correct/incorrect styling
        document.querySelectorAll('.option-item').forEach((item, index) => {
            item.style.pointerEvents = 'none';
            if (index === question.correct) {
                item.classList.add('correct-answer');
            } else if (index === userAnswer && !isCorrect) {
                item.classList.add('wrong-answer');
            }
        });

        // Update submit button
        const submitBtn = document.querySelector('.mcq-btn.primary');
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.selectedQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            if (this.testMode) {
                this.showTestResults();
            } else {
                this.showPracticeComplete();
            }
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    showHint() {
        const question = this.selectedQuestions[this.currentQuestionIndex];
        const category = question.category;
        const tips = this.studyTips[category] || [];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        
        alert(`💡 Study Tip for ${category}:\n\n${randomTip}`);
    }

    showTestResults() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.testStats.timeTaken = Math.floor((Date.now() - this.testStartTime) / 1000);
        this.testStats.unanswered = this.selectedQuestions.length - (this.testStats.correct + this.testStats.wrong);

        const percentage = Math.round((this.testStats.correct / this.selectedQuestions.length) * 100);
        const passed = percentage >= 60; // Assuming 60% is passing

        const questionContainer = document.getElementById('mcq-question-container');
        questionContainer.innerHTML = `
            <div class="test-results">
                <div class="results-header">
                    <div class="result-icon ${passed ? 'passed' : 'failed'}">
                        <i class="fas ${passed ? 'fa-trophy' : 'fa-times-circle'}"></i>
                    </div>
                    <h2>${passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
                    <p class="result-message">${passed ? 'You passed the test!' : 'You need more practice to pass.'}</p>
                </div>
                
                <div class="results-stats">
                    <div class="stat-card">
                        <div class="stat-number">${percentage}%</div>
                        <div class="stat-label">Score</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.testStats.correct}</div>
                        <div class="stat-label">Correct</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.testStats.wrong}</div>
                        <div class="stat-label">Wrong</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${Math.floor(this.testStats.timeTaken / 60)}:${(this.testStats.timeTaken % 60).toString().padStart(2, '0')}</div>
                        <div class="stat-label">Time</div>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button onclick="mcqSystem.reviewAnswers()" class="mcq-btn primary">
                        <i class="fas fa-eye"></i> Review Answers
                    </button>
                    <button onclick="mcqSystem.retakeTest()" class="mcq-btn secondary">
                        <i class="fas fa-redo"></i> Retake Test
                    </button>
                    <button onclick="mcqSystem.backToMenu()" class="mcq-btn secondary">
                        <i class="fas fa-home"></i> Back to Menu
                    </button>
                </div>
            </div>
        `;
    }

    showPracticeComplete() {
        const questionContainer = document.getElementById('mcq-question-container');
        questionContainer.innerHTML = `
            <div class="practice-complete">
                <div class="completion-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Practice Complete!</h2>
                <p>You've completed all questions in this practice session.</p>
                
                <div class="completion-actions">
                    <button onclick="mcqSystem.startPractice()" class="mcq-btn primary">
                        <i class="fas fa-redo"></i> Practice Again
                    </button>
                    <button onclick="mcqSystem.backToMenu()" class="mcq-btn secondary">
                        <i class="fas fa-home"></i> Back to Menu
                    </button>
                </div>
            </div>
        `;
    }

    showNoQuestionsMessage() {
        const questionContainer = document.getElementById('mcq-question-container');
        questionContainer.innerHTML = `
            <div class="no-questions">
                <div class="no-questions-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <h2>No Questions Available</h2>
                <p>No questions found for the selected category.</p>
                
                <div class="no-questions-actions">
                    <button onclick="mcqSystem.backToMenu()" class="mcq-btn primary">
                        <i class="fas fa-home"></i> Back to Menu
                    </button>
                </div>
            </div>
        `;
    }

    updateTestProgress() {
        const progressElement = document.getElementById('test-progress');
        if (progressElement && this.testMode) {
            const answered = this.testStats.correct + this.testStats.wrong;
            const progress = (answered / this.selectedQuestions.length) * 100;
            
            progressElement.innerHTML = `
                <div class="progress-info">
                    <span>Progress: ${answered}/${this.selectedQuestions.length}</span>
                    <span>Correct: ${this.testStats.correct} | Wrong: ${this.testStats.wrong}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            `;
        }
    }

    reviewAnswers() {
        // Implementation for reviewing answers
        alert('Review feature will be implemented in the full version.');
    }

    retakeTest() {
        this.startTest(this.selectedQuestions.length);
    }

    backToMenu() {
        const educationSection = document.getElementById('education');
        if (educationSection) {
            this.showMainMenu();
        }
    }

    showMainMenu() {
        const questionContainer = document.getElementById('mcq-question-container');
        const categoryOptions = Object.keys(this.questionCategories).map(category => 
            `<option value="${category}">${category} (${this.questionCategories[category].length} questions)</option>`
        ).join('');

        questionContainer.innerHTML = `
            <div class="mcq-menu">
                <div class="menu-header">
                    <h2><i class="fas fa-graduation-cap"></i> Civil Engineering License Preparation</h2>
                    <p>Practice and test your knowledge for NEC Civil Engineering License Exam</p>
                </div>
                
                <div class="menu-options">
                    <div class="option-group">
                        <h3><i class="fas fa-dumbbell"></i> Practice Mode</h3>
                        <p>Learn at your own pace with explanations</p>
                        <div class="option-controls">
                            <select id="practice-category" class="category-select">
                                <option value="all">All Categories (${this.questions.length} questions)</option>
                                ${categoryOptions}
                            </select>
                            <button onclick="mcqSystem.startPracticeFromMenu()" class="mcq-btn primary">
                                <i class="fas fa-play"></i> Start Practice
                            </button>
                        </div>
                    </div>
                    
                    <div class="option-group">
                        <h3><i class="fas fa-stopwatch"></i> Test Mode</h3>
                        <p>Timed test simulation with results</p>
                        <div class="option-controls">
                            <select id="test-category" class="category-select">
                                <option value="all">All Categories</option>
                                ${categoryOptions}
                            </select>
                            <select id="test-questions" class="questions-select">
                                <option value="10">10 Questions</option>
                                <option value="20" selected>20 Questions</option>
                                <option value="30">30 Questions</option>
                                <option value="40">40 Questions</option>
                            </select>
                            <button onclick="mcqSystem.startTestFromMenu()" class="mcq-btn primary">
                                <i class="fas fa-clock"></i> Start Test
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="study-resources">
                    <h3><i class="fas fa-book"></i> Study Tips</h3>
                    <div class="tips-container">
                        <div class="tip-card" onclick="mcqSystem.showCategoryTips('Materials & Construction')">
                            <i class="fas fa-hammer"></i>
                            <span>Materials & Construction</span>
                        </div>
                        <div class="tip-card" onclick="mcqSystem.showCategoryTips('Structural Engineering')">
                            <i class="fas fa-building"></i>
                            <span>Structural Engineering</span>
                        </div>
                        <div class="tip-card" onclick="mcqSystem.showCategoryTips('Geotechnical Engineering')">
                            <i class="fas fa-mountain"></i>
                            <span>Geotechnical Engineering</span>
                        </div>
                        <div class="tip-card" onclick="mcqSystem.showCategoryTips('Hydraulics & Water Resources')">
                            <i class="fas fa-water"></i>
                            <span>Hydraulics & Water Resources</span>
                        </div>
                    </div>
                </div>
                
                <div class="about-exam">
                    <h3><i class="fas fa-info-circle"></i> About NEC License Exam</h3>
                    <div class="exam-info">
                        <div class="info-item">
                            <strong>Exam Duration:</strong> 3 hours
                        </div>
                        <div class="info-item">
                            <strong>Total Questions:</strong> 100 (60 Group A + 40 Group B)
                        </div>
                        <div class="info-item">
                            <strong>Passing Score:</strong> 60%
                        </div>
                        <div class="info-item">
                            <strong>Question Types:</strong> Multiple Choice (Group A) + Numerical (Group B)
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    startPracticeFromMenu() {
        const categorySelect = document.getElementById('practice-category');
        const category = categorySelect.value === 'all' ? 'all' : categorySelect.value;
        this.startPractice(category);
    }

    startTestFromMenu() {
        const categorySelect = document.getElementById('test-category');
        const questionsSelect = document.getElementById('test-questions');
        const category = categorySelect.value === 'all' ? 'all' : categorySelect.value;
        const numQuestions = parseInt(questionsSelect.value);
        this.startTest(numQuestions, category);
    }

    showCategoryTips(category) {
        const tips = this.studyTips[category] || [];
        const tipsHtml = tips.map(tip => `<li>${tip}</li>`).join('');
        
        const modal = document.createElement('div');
        modal.className = 'tips-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> Study Tips: ${category}</h3>
                    <button onclick="this.closest('.tips-modal').remove()" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <ul class="tips-list">
                        ${tipsHtml}
                    </ul>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.tips-modal').remove()" class="mcq-btn secondary">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    init() {
        // Initialize the MCQ system when the education section is clicked
        this.showMainMenu();
    }
}

// Initialize MCQ system
let mcqSystem;

// Function to initialize education section
function initEducationSection() {
    mcqSystem = new MCQSystem();
    mcqSystem.init();
    
    // Apply education theme
    document.body.classList.add('education-theme');
}

// Function to exit education section
function exitEducationSection() {
    document.body.classList.remove('education-theme');
}
